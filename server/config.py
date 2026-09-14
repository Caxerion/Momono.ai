from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_PATH = BASE_DIR / "momono.db"

DEFAULT_CONFIG = {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "api_base": "https://openrouter.ai/api/v1",
    "api_key": "",
    "temperature": 0.9,
    "max_tokens": 1024,
    "host": "127.0.0.1",
    "port": 8000,
}

# Dua tier mesin (OpenAI-compatible /chat/completions).
#   tier1 = normal & intimate ringan (lewat Groq/OpenRouter/API lain)
#   tier2 = uncensored / hard NSFW (jalan lewat Ollama/llama.cpp lokal)
# Setiap field bisa dioverride lewat env dengan prefix MOMONO_T1_ / MOMONO_T2_,
# misal MOMONO_T1_MODEL, MOMONO_T1_API_KEY, MOMONO_T2_MODEL, MOMONO_T2_API_BASE.
TIER_PROFILES = {
    "tier1": {
        "label": "Normal",
        "model": "openai/gpt-oss-120b",
        "api_base": "https://api.groq.com/openai/v1",
        "api_key": "",
        "temperature": 0.9,
        "max_tokens": 2048,
    },
    "tier2": {
        "label": "NSFW",
        "model": "d89ftekb7/mistral-nemo-uncensored:12b-q4_0",
        "api_base": "http://127.0.0.1:11434/v1",
        "api_key": "ollama",
        "temperature": 0.95,
        "max_tokens": 2048,
    },
}

# "Chat model" = gaya respond yang dipilih user, diterapkan sebagai lapisan
# style di atas engine mana pun (tier1/tier2) — jadi pemilihan style dipisah
# dari level NSFW. Prompt "standard" sengaja kosong agar tidak menambah instruksi.
# prompt_tier1 = varian yang dipakai saat engine tier1 (ada guardrail),
# prompt_tier2 = varian untuk engine tier2 (uncensored / Ollama lokal).
# Nilai di bawah hanya seed awal; setelah itu diedit lewat panel admin.
CHAT_MODELS = [
    {
        "key": "standard",
        "label": "Standard",
        "description": "Seimbang dan natural, cocok untuk RP umum.",
        "prompt_tier1": "",
        "prompt_tier2": "",
        "sort_order": 1,
    },
    {
        "key": "sharp",
        "label": "Sharp",
        "description": "Tegas, cerdas, to the point, sedikit sarkastik.",
        "prompt_tier1": (
            "Also adopt a SHARP personality style: you are direct, clever, "
            "confident, and a bit witty/sarcastic. Keep responses concise and "
            "punchy, but still follow the same roleplay format."
        ),
        "prompt_tier2": (
            "Also adopt a SHARP personality style: you are direct, clever, "
            "confident, and a bit witty/sarcastic. Keep responses concise and "
            "punchy, but still follow the same roleplay format."
        ),
        "sort_order": 2,
    },
    {
        "key": "romance",
        "label": "Romance",
        "description": "Lembut, hangat, puitis, penuh nuansa.",
        "prompt_tier1": (
            "Also adopt a ROMANTIC personality style: you are gentle, warm, "
            "poetic and attentive to small details. Let your words flow with "
            "tender, evocative language while staying in the roleplay format."
        ),
        "prompt_tier2": (
            "Also adopt a ROMANTIC personality style: you are gentle, warm, "
            "poetic and attentive to small details. Let your words flow with "
            "tender, evocative language while staying in the roleplay format."
        ),
        "sort_order": 3,
    },
    {
        "key": "naughty",
        "label": "Naughty",
        "description": "Berani, mengoda, flirty. Tier 2 = eksplisit 18+.",
        "prompt_tier1": (
            "Also adopt a FLIRTY personality style: playful, warm and charming. "
            "You may show desire, tension, teasing and physical closeness "
            "(touching, hugging, whispers, holding hands). Romantic/affectionate "
            "intimacy and implied situations are allowed — when things heat up, "
            "fade to black with a suggestive cutaway like \"...\". Never write "
            "explicit sexual acts or anatomical or coarse language."
        ),
        "prompt_tier2": (
            "Also adopt a NAUGHTY personality style: bold, flirty, teasing and "
            "charming. You are an adult (18+) and comfortable with uncensored "
            "explicit intimacy when the story escalates, while staying "
            "consistent with the character and the roleplay format."
        ),
        "sort_order": 4,
    },
]
