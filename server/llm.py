import json
import os
from collections.abc import AsyncIterator

import httpx
from config import CHAT_MODELS, TIER_PROFILES
from db import connect


def _apply_env(cfg: dict, prefix: str) -> None:
    for key, value in cfg.items():
        env_val = os.environ.get(f"{prefix}{key.upper()}")
        if env_val is None:
            continue
        if isinstance(value, bool):
            cfg[key] = env_val.lower() in ("1", "true", "yes")
        elif isinstance(value, int):
            cfg[key] = int(env_val)
        elif isinstance(value, float):
            cfg[key] = float(env_val)
        else:
            cfg[key] = env_val


def load_config(tier: str = "tier1") -> dict:
    if tier not in TIER_PROFILES:
        tier = "tier1"
    cfg = dict(TIER_PROFILES[tier])
    prefix = "MOMONO_T1_" if tier == "tier1" else "MOMONO_T2_"
    _apply_env(cfg, prefix)
    if tier == "tier1":
        # Backward-compat: prefix lama MOMONO_* (tanpa T1) tetap dibaca
        # untuk key yang tidak dioverride spesifik per-tier.
        for key, value in cfg.items():
            if os.environ.get(f"{prefix}{key.upper()}") is not None:
                continue
            env_val = os.environ.get(f"MOMONO_{key.upper()}")
            if env_val is None:
                continue
            if isinstance(value, bool):
                cfg[key] = env_val.lower() in ("1", "true", "yes")
            elif isinstance(value, int):
                cfg[key] = int(env_val)
            elif isinstance(value, float):
                cfg[key] = float(env_val)
            else:
                cfg[key] = env_val
    return cfg


def list_tiers() -> list[dict]:
    return [
        {"key": key, "label": profile.get("label", key), "model": profile["model"]}
        for key, profile in TIER_PROFILES.items()
    ]


def _chat_model_seed_rows() -> list[dict]:
    return [
        {
            "key": m["key"],
            "label": m["label"],
            "description": m.get("description", ""),
            "prompt_tier1": m.get("prompt_tier1", ""),
            "prompt_tier2": m.get("prompt_tier2", ""),
            "sort_order": m.get("sort_order", 0),
        }
        for m in CHAT_MODELS
    ]


def _chat_model_rows_from_db() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT key, label, COALESCE(description,'') AS description,
                   COALESCE(prompt_tier1,'') AS prompt_tier1,
                   COALESCE(prompt_tier2,'') AS prompt_tier2,
                   COALESCE(sort_order,0) AS sort_order
            FROM chat_models
            ORDER BY sort_order, key
            """
        ).fetchall()
    return [dict(r) for r in rows]


def list_chat_models() -> list[dict]:
    rows = _chat_model_rows_from_db() or _chat_model_seed_rows()
    return [
        {
            "key": r["key"],
            "label": r["label"],
            "description": r["description"],
        }
        for r in rows
    ]


def get_chat_model(key: str, tier: str = "tier1") -> dict:
    rows = _chat_model_rows_from_db() or _chat_model_seed_rows()
    row = next((r for r in rows if r["key"] == key), None)
    if row is None:
        row = rows[0]
    prompt = row["prompt_tier2"] if tier == "tier2" else row["prompt_tier1"]
    return {"key": row["key"], "label": row["label"], "prompt": prompt}


REFUSAL_PATTERNS = (
    "i'm sorry",
    "i am sorry",
    "i cannot",
    "i can't",
    "cannot fulfill",
    "can't continue",
    "cannot continue",
    "can't assist",
    "cannot assist",
    "can't help",
    "cannot help",
    "i don't feel comfortable",
    "as an ai",
    "as a language model",
    "i'm not able",
    "i am not able",
    "not able to fulfill",
    "not able to engage",
    "not able to help",
    "not permitted",
    "can't do that",
    "won't be able",
    "don't think i can",
)


def _norm(text: str) -> str:
    return (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )


def looks_like_refusal(text: str) -> bool:
    t = _norm(text).strip().lower()
    return any(p in t for p in REFUSAL_PATTERNS)


async def collect_chat(
    messages: list[dict], cfg: dict, retries: int = 3
) -> str:
    """Stream the full chat completion into a single buffer, retrying on transient errors.

    429 (rate limit) diberi backoff jauh lebih panjang karena Groq membatasi
    request per jendela menit — retry cepat hanya akan gagal terus.
    """
    import asyncio

    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            buf = ""
            async for piece in stream_chat(messages, cfg):
                buf += piece
            return buf
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            code = exc.response.status_code
            retryable = code in (429, 500, 502, 503, 504)
            if retryable and attempt < retries:
                if code == 429:
                    backoff = 5 * (attempt + 1) ** 2  # 5, 20, 45 detik
                    if retry_after := exc.response.headers.get("Retry-After"):
                        try:
                            backoff = max(backoff, int(retry_after))
                        except ValueError:
                            pass
                else:
                    backoff = 2 * (attempt + 1)  # 2, 4, 6 detik
                await asyncio.sleep(backoff)
                continue
            raise
    raise last_exc  # type: ignore[misc]


async def stream_chat(
    messages: list[dict], cfg: dict
) -> AsyncIterator[str]:
    if not cfg.get("api_key"):
        raise RuntimeError("MOMONO_API_KEY belum di-set")

    payload = {
        "model": cfg["model"],
        "messages": messages,
        "temperature": cfg["temperature"],
        "max_tokens": cfg["max_tokens"],
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {cfg['api_key']}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client, client.stream(
        "POST",
        f"{cfg['api_base']}/chat/completions",
        headers=headers,
        json=payload,
    ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line or not line.startswith("data:"):
                continue
            data = line[len("data:") :].strip()
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
            except json.JSONDecodeError:
                continue
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            if content := delta.get("content"):
                yield content
