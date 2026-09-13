import hashlib
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from db import connect, init_db
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from generator import generate, MODEL_MAP
from llm import load_config, stream_chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("momono")

app = FastAPI()
cfg = load_config()

generated_dir = Path(__file__).parent / "generated"
generated_dir.mkdir(exist_ok=True)
app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")


def current_user(req: Request) -> str:
    return req.headers.get("X-User-Id", "anonymous")


def resolve_user_vars(text: str, user_name: str) -> str:
    """Gantikan placeholder {user} dengan nama user yang sedang chat."""
    if not text:
        return text
    name = user_name or "user"
    return text.replace("{user}", name).replace("{User}", name)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "model": cfg["model"]}


@app.get("/api/conversations")
def list_conversations(req: Request, persona_id: str | None = None):
    user_id = current_user(req)
    with connect() as conn:
        if persona_id:
            rows = conn.execute(
                "SELECT * FROM conversations WHERE persona_id=? AND user_id=? ORDER BY updated_at DESC",
                (persona_id, user_id),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM conversations WHERE user_id=? ORDER BY updated_at DESC",
                (user_id,),
            ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/conversations")
async def create_conversation(req: Request):
    data = await req.json()
    cid = str(uuid.uuid4())
    title = data.get("title", "New Chat")
    persona_id = data.get("persona_id")
    user_id = current_user(req)
    ts = now()
    with connect() as conn:
        conn.execute(
            "INSERT INTO conversations (id, title, persona_id, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (cid, title, persona_id, user_id, ts, ts),
        )
        conn.commit()
    return {"id": cid, "title": title, "persona_id": persona_id}


@app.get("/api/conversations/{cid}/messages")
def get_messages(cid: str, req: Request):
    user_id = current_user(req)
    with connect() as conn:
        conv = conn.execute(
            "SELECT id FROM conversations WHERE id=? AND user_id=?",
            (cid, user_id),
        ).fetchone()
        if not conv:
            return {"error": "not found"}
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY id ASC",
            (cid,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/conversations/{cid}/messages")
async def add_message(cid: str, req: Request):
    user_id = current_user(req)
    data = await req.json()
    role = data.get("role", "user")
    content = data.get("content", "")
    with connect() as conn:
        conv = conn.execute(
            "SELECT id FROM conversations WHERE id=? AND user_id=?",
            (cid, user_id),
        ).fetchone()
        if not conv:
            return {"error": "not found"}
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?,?,?,?)",
            (cid, role, content, now()),
        )
        conn.commit()
    return {"ok": True}


@app.post("/api/chat")
async def chat(req: Request):
    data = await req.json()
    cid = data.get("conversation_id")
    user_msg = data.get("message", "")
    persona_id = data.get("persona_id")
    persona_prompt = data.get("system_prompt", "")
    user_name = data.get("user_name", "")
    is_regenerate = data.get("is_regenerate", False)
    regenerate_index = data.get("regenerate_index", 0)
    if cid:
        with connect() as conn:
            conv = conn.execute(
                "SELECT id FROM conversations WHERE id=? AND user_id=?",
                (cid, current_user(req)),
            ).fetchone()
        if not conv:
            return {"error": "not found"}
    if user_name:
        persona_prompt = (
            f"The user chatting with you is named {user_name}. "
            "Always address them by this name.\n\n" + persona_prompt
        )
    if persona_id:
        with connect() as conn:
            row = conn.execute(
                "SELECT about, system_prompt, greeting, personality FROM personas WHERE id=?", (persona_id,)
            ).fetchone()
        if row:
            persona_about = resolve_user_vars(row["about"] or row["system_prompt"] or "", user_name)
            greeting = row["greeting"] or ""
            personality = resolve_user_vars(row["personality"] or "", user_name)
            parts = [p for p in [persona_about, personality] if p]
            if parts:
                persona_prompt = "\n\n".join(parts) + "\n\n" + persona_prompt
        else:
            greeting = ""
    else:
        greeting = ""

    history = []
    if cid:
        with connect() as conn:
            rows = conn.execute(
                "SELECT role, content FROM messages WHERE conversation_id=? ORDER BY id ASC",
                (cid,),
            ).fetchall()
        history = [{"role": r["role"], "content": r["content"]} for r in rows]

    if not history and greeting:
        history = [{"role": "assistant", "content": resolve_user_vars(greeting, user_name)}]

    messages = []
    if persona_prompt:
        messages.append({"role": "system", "content": persona_prompt})
    messages.extend(history)
    messages.append({"role": "user", "content": user_msg})

    async def event_stream():
        acc = ""
        if cid and not is_regenerate:
            with connect() as conn:
                conn.execute(
                    "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?,?,?,?)",
                    (cid, "user", user_msg, now()),
                )
                conn.commit()
        async for piece in stream_chat(messages, cfg):
            acc += piece
            yield piece
        if cid:
            with connect() as conn:
                conn.execute(
                    "INSERT INTO messages (conversation_id, role, content, regenerate_index, created_at) VALUES (?,?,?,?,?)",
                    (cid, "assistant", acc, regenerate_index, now()),
                )
                conn.execute(
                    "UPDATE conversations SET updated_at=? WHERE id=?",
                    (now(), cid),
                )
                conn.commit()

    return StreamingResponse(event_stream(), media_type="text/plain")

@app.get("/api/personas")
def list_personas(req: Request, mine: bool = False, user_id: int | None = None):
    user_id_current = current_user(req)
    with connect() as conn:
        if mine:
            rows = conn.execute(
                "SELECT * FROM personas WHERE user_id=? ORDER BY created_at DESC",
                (user_id_current,),
            ).fetchall()
        elif user_id is not None:
            rows = conn.execute(
                "SELECT * FROM personas WHERE user_id=? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM personas ORDER BY created_at DESC"
            ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/personas/{pid}")
def get_persona(pid: str):
    with connect() as conn:
        row = conn.execute("SELECT * FROM personas WHERE id=?", (pid,)).fetchone()
    if not row:
        return {"error": "not found"}
    return dict(row)


@app.get("/api/categories")
def list_categories():
    with connect() as conn:
        rows = conn.execute("SELECT name FROM categories ORDER BY name ASC").fetchall()
    return [dict(r) for r in rows]


@app.get("/api/personas/{pid}/reactions")
def get_persona_reactions(pid: str, req: Request):
    user_id = current_user(req)
    with connect() as conn:
        row = conn.execute(
            "SELECT likes, dislikes FROM personas WHERE id=?", (pid,)
        ).fetchone()
        reactions = conn.execute(
            "SELECT value FROM persona_reactions WHERE persona_id=? AND user_id=?",
            (pid, user_id),
        ).fetchall()
    if not row:
        return {"error": "not found"}
    my_value = reactions[0]["value"] if reactions else None
    return {
        "likes": row["likes"] or 0,
        "dislikes": row["dislikes"] or 0,
        "my_reaction": my_value,
    }


@app.post("/api/personas/{pid}/reaction")
async def toggle_persona_reaction(pid: str, req: Request):
    data = await req.json()
    value = data.get("value")
    if value not in ("like", "dislike"):
        return {"error": "invalid value"}
    column = "likes" if value == "like" else "dislikes"
    user_id = current_user(req)
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM personas WHERE id=?", (pid,)
        ).fetchone()
        if not row:
            return {"error": "not found"}
        existing = conn.execute(
            "SELECT value FROM persona_reactions WHERE persona_id=? AND user_id=?",
            (pid, user_id),
        ).fetchone()
        existing_col = "likes" if existing and existing["value"] == "like" else "dislikes"
        new_value = None
        if existing:
            if existing["value"] == value:
                # toggle off
                conn.execute(
                    "DELETE FROM persona_reactions WHERE persona_id=? AND user_id=?",
                    (pid, user_id),
                )
                conn.execute(
                    f'UPDATE personas SET "{column}"="{column}"-1 WHERE id=?',
                    (pid,),
                )
            else:
                # switch
                conn.execute(
                    "UPDATE persona_reactions SET value=? WHERE persona_id=? AND user_id=?",
                    (value, pid, user_id),
                )
                conn.execute(
                    f'UPDATE personas SET "{existing_col}"="{existing_col}"-1 WHERE id=?',
                    (pid,),
                )
                conn.execute(
                    f'UPDATE personas SET "{column}"="{column}"+1 WHERE id=?',
                    (pid,),
                )
                new_value = value
        else:
            conn.execute(
                "INSERT INTO persona_reactions (persona_id, user_id, value) VALUES (?,?,?)",
                (pid, user_id, value),
            )
            conn.execute(
                f'UPDATE personas SET "{column}"="{column}"+1 WHERE id=?',
                (pid,),
            )
            new_value = value
        conn.commit()
        counts = conn.execute(
            "SELECT likes, dislikes FROM personas WHERE id=?", (pid,)
        ).fetchone()
    return {
        "likes": counts["likes"] or 0,
        "dislikes": counts["dislikes"] or 0,
        "my_reaction": new_value,
    }

@app.get("/api/personas/{pid}/favorite")
def get_persona_favorite(pid: str, req: Request):
    user_id = current_user(req)
    with connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM persona_favorites WHERE persona_id=? AND user_id=?",
            (pid, user_id),
        ).fetchone()
    return {"favorite": row is not None}


@app.post("/api/personas/{pid}/favorite")
async def toggle_persona_favorite(pid: str, req: Request):
    data = await req.json()
    user_id = current_user(req)
    with connect() as conn:
        row = conn.execute("SELECT id FROM personas WHERE id=?", (pid,)).fetchone()
        if not row:
            return {"error": "not found"}
        existing = conn.execute(
            "SELECT 1 FROM persona_favorites WHERE persona_id=? AND user_id=?",
            (pid, user_id),
        ).fetchone()
        if data.get("favorite", True):
            if not existing:
                conn.execute(
                    "INSERT INTO persona_favorites (persona_id, user_id, created_at) VALUES (?,?,?)",
                    (pid, user_id, now()),
                )
            favorite = True
        else:
            if existing:
                conn.execute(
                    "DELETE FROM persona_favorites WHERE persona_id=? AND user_id=?",
                    (pid, user_id),
                )
            favorite = False
        conn.commit()
    return {"favorite": favorite}

@app.post("/api/personas")
async def create_persona(req: Request):
    data = await req.json()
    pid = str(uuid.uuid4())
    name = data.get("name", "Untitled Bot")
    title = data.get("title", "")
    about = data.get("about", "")
    greeting = data.get("greeting", "")
    personality = data.get("personality", "")
    created_by = data.get("created_by", "")
    categories = data.get("categories", "")
    user_id = current_user(req)
    with connect() as conn:
        conn.execute(
            "INSERT INTO personas (id, name, title, system_prompt, about, greeting, personality, created_by, user_id, created_at, categories) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (pid, name, title, about, about, greeting, personality, created_by, user_id, now(), categories),
        )
        conn.commit()
    return {"id": pid, "name": name}

@app.put("/api/personas/{pid}")
async def update_persona(pid: str, req: Request):
    user_id = current_user(req)
    data = await req.json()
    about = data.get("about", "")
    personality = data.get("personality", "")
    categories = data.get("categories", "")
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM personas WHERE id=? AND user_id=?", (pid, user_id)
        ).fetchone()
        if not row:
            return {"error": "not found"}
        conn.execute(
            "UPDATE personas SET name=?, title=?, system_prompt=?, about=?, greeting=?, personality=?, categories=? WHERE id=?",
            (data.get("name", ""), data.get("title", ""), about, about, data.get("greeting", ""), personality, categories, pid),
        )
        conn.commit()
    return {"ok": True}
@app.delete("/api/personas/{pid}")
def delete_persona(pid: str, req: Request):
    user_id = current_user(req)
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM personas WHERE id=? AND user_id=?", (pid, user_id)
        ).fetchone()
        if not row:
            return {"error": "not found"}
        conn.execute("DELETE FROM personas WHERE id=?", (pid,))
        conn.commit()
    return {"ok": True}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

@app.post("/api/personas/{pid}/avatar")
async def upload_persona_avatar(pid: str, avatar: UploadFile = File(...)):  # noqa: B008
    ext = os.path.splitext(avatar.filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        return {"error": "unsupported format"}
    content = await avatar.read()
    if len(content) > 5 * 1024 * 1024:
        return {"error": "file too large (max 5MB)"}
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_hash = hashlib.md5(content).hexdigest()[:12]
    filename = f"persona_{pid}_{file_hash}{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:  # noqa: ASYNC230
        f.write(content)
    avatar_url = f"/uploads/{filename}"
    with connect() as conn:
        conn.execute("UPDATE personas SET avatar_url=? WHERE id=?", (avatar_url, pid))
        conn.commit()
    return {"avatar_url": avatar_url}

@app.delete("/api/personas/{pid}/avatar")
async def delete_persona_avatar(pid: str):
    with connect() as conn:
        row = conn.execute("SELECT avatar_url FROM personas WHERE id=?", (pid,)).fetchone()
        if row and row["avatar_url"]:
            file_path = os.path.join(UPLOAD_DIR, os.path.basename(row["avatar_url"]))
            if os.path.exists(file_path):
                os.remove(file_path)
        conn.execute("UPDATE personas SET avatar_url=NULL WHERE id=?", (pid,))
        conn.commit()
    return {"ok": True}


@app.delete("/api/conversations/persona/{pid}")
def delete_persona_conversations(pid: str, req: Request):
    user_id = current_user(req)
    with connect() as conn:
        conn.execute("DELETE FROM conversations WHERE persona_id=? AND user_id=?", (pid, user_id))
        conn.commit()
    return {"ok": True}


@app.get("/api/user/favorites")
def list_user_favorites(req: Request, user_id: int | None = None):
    uid = str(user_id) if user_id is not None else current_user(req)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT p.* FROM personas p
            JOIN persona_favorites f ON f.persona_id = p.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
            """,
            (uid,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/users/{uid}/stats")
def user_stats(uid: str):
    with connect() as conn:
        followers = conn.execute(
            "SELECT COUNT(*) FROM user_follows WHERE following_id=?", (uid,)
        ).fetchone()[0]
        following = conn.execute(
            "SELECT COUNT(*) FROM user_follows WHERE follower_id=?", (uid,)
        ).fetchone()[0]
        favorites = conn.execute(
            "SELECT COUNT(*) FROM user_favorites WHERE creator_id=?", (uid,)
        ).fetchone()[0]
    return {"followers": followers, "following": following, "favorites": favorites}


@app.get("/api/users/{uid}/relation")
def user_relation(uid: str, req: Request):
    me = current_user(req)
    with connect() as conn:
        following = conn.execute(
            "SELECT 1 FROM user_follows WHERE follower_id=? AND following_id=?",
            (me, uid),
        ).fetchone() is not None
        favorite = conn.execute(
            "SELECT 1 FROM user_favorites WHERE user_id=? AND creator_id=?",
            (me, uid),
        ).fetchone() is not None
    return {"following": following, "favorite": favorite}


@app.post("/api/users/{uid}/follow")
async def toggle_user_follow(uid: str, req: Request):
    data = await req.json()
    me = current_user(req)
    if me == uid:
        return {"error": "cannot follow yourself"}
    ts = now()
    with connect() as conn:
        existing = conn.execute(
            "SELECT 1 FROM user_follows WHERE follower_id=? AND following_id=?",
            (me, uid),
        ).fetchone()
        if data.get("following", True):
            if not existing:
                conn.execute(
                    "INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?,?,?)",
                    (me, uid, ts),
                )
            following = True
        else:
            if existing:
                conn.execute(
                    "DELETE FROM user_follows WHERE follower_id=? AND following_id=?",
                    (me, uid),
                )
            following = False
        conn.commit()
    return {"following": following}


@app.post("/api/users/{uid}/favorite")
async def toggle_user_favorite(uid: str, req: Request):
    data = await req.json()
    me = current_user(req)
    if me == uid:
        return {"error": "cannot favorite yourself"}
    ts = now()
    with connect() as conn:
        existing = conn.execute(
            "SELECT 1 FROM user_favorites WHERE user_id=? AND creator_id=?",
            (me, uid),
        ).fetchone()
        if data.get("favorite", True):
            if not existing:
                conn.execute(
                    "INSERT INTO user_favorites (user_id, creator_id, created_at) VALUES (?,?,?)",
                    (me, uid, ts),
                )
            favorite = True
        else:
            if existing:
                conn.execute(
                    "DELETE FROM user_favorites WHERE user_id=? AND creator_id=?",
                    (me, uid),
                )
            favorite = False
        conn.commit()
    return {"favorite": favorite}


@app.post("/api/users/{uid}/report")
async def report_user(uid: str, req: Request):
    data = await req.json()
    me = current_user(req)
    reason = data.get("reason", "")
    ts = now()
    with connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO user_reports (reporter_id, reported_id, reason, created_at) VALUES (?,?,?,?)",
            (me, uid, reason, ts),
        )
        conn.commit()
    return {"ok": True}


@app.get("/api/generate/models")
def list_generate_models():
    """Daftar model yang tersedia untuk generate gambar/video."""
    return {
        name: {
            "type": kind,
            "label": {
                "dalle3": "OpenAI GPT-Image",
                "sdxl": "Stability Core",
                "sd3": "Stability SD3",
                "hf-sdxl": "Flux (Free)",
                "svd": "Stable Video Diffusion",
            }.get(name, name),
        }
        for name, (kind, _) in MODEL_MAP.items()
    }


def _gen_error_message(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        body = (exc.response.text or "")[:200]
        return f"Provider AI menolak: HTTP {exc.response.status_code} {body}"
    if isinstance(exc, httpx.ConnectError):
        if "huggingface" in str(exc).lower() or "getaddrinfo" in str(exc).lower():
            return "Tidak bisa terhubung ke provider (domain kemungkinan diblokir ISP, nyalakan VPN). Coba model Stability Core."
        return "Tidak bisa terhubung ke provider AI (cek koneksi internet / VPN)"
    if isinstance(exc, httpx.TimeoutException):
        return "Provider AI terlalu lama merespons, coba lagi"
    return str(exc) or exc.__class__.__name__


@app.post("/api/generate")
async def api_generate(req: Request):
    body = await req.json()
    prompt = (body.get("prompt") or "").strip()
    if not prompt:
        return {"error": "prompt is required"}

    model = body.get("model") or "sdxl"
    try:
        result = await generate(model=model, prompt=prompt)
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:
        logger.exception("Generate failed (model=%s)", model)
        return {"error": _gen_error_message(exc)}

    return {
        "url": f"/generated/{result['filename']}",
        "type": result["type"],
        "model": model,
    }
