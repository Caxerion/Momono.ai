import asyncio
import base64
import httpx
import os
import uuid
from pathlib import Path

GENERATED_DIR = Path(__file__).parent / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")

# ─── Helpers ───────────────────────────────────────────────────────────────────

def _save_bytes(data: bytes, ext: str = ".png") -> str:
    """Save raw bytes to generated/ and return the filename."""
    name = f"{uuid.uuid4().hex}{ext}"
    (GENERATED_DIR / name).write_bytes(data)
    return name


def _save_b64(b64: str, ext: str = ".png") -> str:
    """Decode base64 and save, return filename."""
    return _save_bytes(base64.b64decode(b64), ext)


async def _download_url(url: str) -> bytes:
    """Download a file from URL and return bytes."""
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


# ─── Provider: OpenAI DALL-E 3 ────────────────────────────────────────────────

async def generate_dalle3(prompt: str, size: str = "1024x1024", quality: str = "standard") -> str:
    """
    Generate image via OpenAI DALL-E 3.
    Returns filename saved in generated/.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": quality,
                "response_format": "b64_json",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        b64 = data["data"][0]["b64_json"]
        return _save_b64(b64, ".png")


# ─── Provider: Stability AI (SDXL) ────────────────────────────────────────────

async def generate_stability(prompt: str, width: int = 1024, height: int = 1024) -> str:
    """
    Generate image via Stability AI (SDXL).
    Returns filename saved in generated/.
    """
    if not STABILITY_API_KEY:
        raise ValueError("STABILITY_API_KEY not set")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            headers={
                "Authorization": f"Bearer {STABILITY_API_KEY}",
                "Accept": "application/json",
            },
            data={
                "text_prompts[0][text]": prompt,
                "text_prompts[0][weight]": 1,
                "cfg_scale": 7,
                "width": width,
                "height": height,
                "samples": 1,
                "steps": 30,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        b64 = data["artifacts"][0]["base64"]
        return _save_b64(b64, ".png")


# ─── Provider: Hugging Face Inference ─────────────────────────────────────────

async def generate_hf(prompt: str, model: str = "stabilityai/stable-diffusion-xl-base-1.0") -> str:
    """
    Generate image via Hugging Face Inference API (free tier).
    Returns filename saved in generated/.
    """
    if not HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not set")

    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(url, headers=headers, json={"inputs": prompt})
        resp.raise_for_status()
        return _save_bytes(resp.content, ".png")


# ─── Provider: Replicate (Video) ──────────────────────────────────────────────

async def generate_video_replicate(prompt: str) -> str:
    """
    Generate video via Replicate (Stable Video Diffusion or similar).
    Returns filename saved in generated/.
    """
    if not REPLICATE_API_TOKEN:
        raise ValueError("REPLICATE_API_TOKEN not set")

    headers = {"Authorization": f"Bearer {REPLICATE_API_TOKEN}"}

    async with httpx.AsyncClient(timeout=300) as client:
        # Start prediction
        resp = await client.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json={
                "version": "9f747673945c62801b13b84701c783929c0ee784e4748ec0622f485bcf756267",
                "input": {"prompt": prompt},
            },
        )
        resp.raise_for_status()
        pred = resp.json()
        poll_url = pred.get("urls", {}).get("get", pred.get("url"))

        if not poll_url:
            raise ValueError("No poll URL returned from Replicate")

        # Poll until completed (max 5 min)
        for _ in range(60):
            await asyncio.sleep(5)
            r = await client.get(poll_url, headers=headers)
            r.raise_for_status()
            status = r.json()
            if status["status"] == "succeeded":
                output = status["output"]
                video_url = output[0] if isinstance(output, list) else output
                video_bytes = await _download_url(video_url)
                return _save_bytes(video_bytes, ".mp4")
            elif status["status"] == "failed":
                raise ValueError(f"Replicate failed: {status.get('error')}")

        raise TimeoutError("Replicate video generation timed out")


# ─── Unified API ───────────────────────────────────────────────────────────────

MODEL_MAP = {
    # image models
    "dalle3":       ("image", generate_dalle3),
    "sdxl":         ("image", generate_stability),
    "hf-sdxl":      ("image", generate_hf),
    # video models
    "svd":          ("video", generate_video_replicate),
}

DEFAULT_MODEL = "dalle3"


async def generate(model: str | None = None, prompt: str = "", **kwargs) -> dict:
    """
    Unified generate entry point.

    Args:
        model:  Model key from MODEL_MAP (default: "dalle3").
        prompt: Text prompt.
        **kwargs: Extra params forwarded to the provider (size, quality, etc.).

    Returns:
        { "filename": "abc.png", "type": "image" }
    """
    model = model or DEFAULT_MODEL
    if model not in MODEL_MAP:
        raise ValueError(f"Unknown model: {model}. Available: {list(MODEL_MAP.keys())}")

    kind, fn = MODEL_MAP[model]

    # forward kwargs for flexibility
    if kind == "image" and model == "hf-sdxl":
        # HF provider uses model kwarg
        filename = await fn(prompt, **kwargs)
    else:
        filename = await fn(prompt, **kwargs)

    return {"filename": filename, "type": kind}