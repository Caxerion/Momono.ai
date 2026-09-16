import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from db import connect
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request

AUTH_DB = Path(__file__).resolve().parent.parent / "init" / "auth.db"

router = APIRouter(prefix="/api/admin")


def is_admin(req: Request) -> bool:
    # Header ini hanya diisi oleh server Go (init/main.go) setelah
    # validasi session. Client tidak bisa memalsukannya.
    return req.headers.get("X-User-Admin") == "1"


@contextmanager
def auth_conn():
    conn = sqlite3.connect(AUTH_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def admin_usernames() -> set[str]:
    raw = os.environ.get("MOMONO_ADMINS", "")
    if not raw:
        load_dotenv(Path(__file__).resolve().parent.parent / "init" / ".env")
        raw = os.environ.get("MOMONO_ADMINS", "")
    return {u.strip() for u in raw.split(",") if u.strip()}


def _guard(req: Request) -> None:
    if not is_admin(req):
        raise HTTPException(status_code=403, detail="forbidden")


@router.get("/stats")
def admin_stats(req: Request):
    _guard(req)
    with auth_conn() as auth:
        users = auth.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    with connect() as conn:
        personas = conn.execute("SELECT COUNT(*) FROM personas").fetchone()[0]
        conversations = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
        messages = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        reports = conn.execute("SELECT COUNT(*) FROM user_reports").fetchone()[0]

    # Trend 7 hari terakhir: user baru & pesan per hari (dari-saat-ini mundur 6 hari)
    today = datetime.now(timezone.utc).date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    user_day = {}
    msg_day = {}
    conv_day = {}
    with auth_conn() as auth:
        for (ds,) in auth.execute(
            "SELECT date(created_at) FROM users WHERE created_at >= ?",
            (f"{days[0]} 00:00:00",),
        ).fetchall():
            user_day[ds] = user_day.get(ds, 0) + 1
    with connect() as conn:
        for (ds,) in conn.execute(
            "SELECT date(created_at) FROM messages"
        ).fetchall():
            msg_day[ds] = msg_day.get(ds, 0) + 1
        for (ds,) in conn.execute(
            "SELECT date(created_at) FROM conversations"
        ).fetchall():
            conv_day[ds] = conv_day.get(ds, 0) + 1

    trend = []
    for d in days:
        ds = d.isoformat()
        trend.append(
            {
                "date": ds,
                "label": d.strftime("%a"),
                "users": user_day.get(ds, 0),
                "messages": msg_day.get(ds, 0),
                "conversations": conv_day.get(ds, 0),
            }
        )

    # Distribusi per kategori (top 4) — kategori disimpan sebagai CSV di personas.categories
    with connect() as conn:
        rows = conn.execute(
            "SELECT COALESCE(categories,'') AS categories FROM personas"
        ).fetchall()
    cat_counts: dict[str, int] = {}
    for (cats,) in rows:
        for c in cats.split(","):
            c = c.strip()
            if c:
                cat_counts[c] = cat_counts.get(c, 0) + 1
    cats = sorted(
        ({"cat": k, "n": v} for k, v in cat_counts.items()),
        key=lambda x: x["n"],
        reverse=True,
    )[:4]

    return {
        "users": users,
        "personas": personas,
        "conversations": conversations,
        "messages": messages,
        "reports": reports,
        "trend": trend,
        "categories": cats,
    }


@router.get("/users")
def admin_users(req: Request):
    _guard(req)
    admins = admin_usernames()
    with auth_conn() as auth:
        rows = auth.execute(
            """
            SELECT id, username, COALESCE(email,'') AS email,
                   COALESCE(display_name,'') AS display_name, created_at
            FROM users ORDER BY id ASC
            """
        ).fetchall()
    with connect() as conn:
        out = []
        for r in rows:
            uid = str(r["id"])
            out.append(
                {
                    "id": r["id"],
                    "username": r["username"],
                    "email": r["email"],
                    "display_name": r["display_name"],
                    "created_at": r["created_at"],
                    "is_admin": r["username"] in admins,
                    "personas": conn.execute(
                        "SELECT COUNT(*) FROM personas WHERE user_id=?", (uid,)
                    ).fetchone()[0],
                    "conversations": conn.execute(
                        "SELECT COUNT(*) FROM conversations WHERE user_id=?", (uid,)
                    ).fetchone()[0],
                }
            )
    return out


@router.get("/personas")
def admin_personas(req: Request):
    _guard(req)
    with connect() as conn:
        counts = dict(
            conn.execute(
                "SELECT persona_id, COUNT(*) FROM conversations WHERE persona_id IS NOT NULL GROUP BY persona_id"
            ).fetchall()
        )
        rows = conn.execute(
            """
            SELECT id, name, COALESCE(title,'') AS title,
                   COALESCE(categories,'') AS categories,
                   COALESCE(created_by,'') AS created_by,
                   COALESCE(user_id,'') AS user_id, created_at,
                   COALESCE(likes,0) AS likes, COALESCE(dislikes,0) AS dislikes
            FROM personas ORDER BY created_at DESC
            """
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["conversations"] = counts.get(r["id"], 0)
        out.append(d)
    return out


@router.get("/conversations")
def admin_conversations(req: Request):
    _guard(req)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.title, c.persona_id, c.user_id, c.updated_at,
                   COALESCE(p.name,'') AS persona_name
            FROM conversations c
            LEFT JOIN personas p ON p.id = c.persona_id
            ORDER BY c.updated_at DESC LIMIT 200
            """
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/reports")
def admin_reports(req: Request):
    _guard(req)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT reporter_id, reported_id, COALESCE(reason,'') AS reason, created_at,
                   COALESCE(target_type,'user') AS target_type
            FROM user_reports ORDER BY created_at DESC
            """
        ).fetchall()
    names: dict[str, str] = {}
    with auth_conn() as auth:
        for row in auth.execute("SELECT id, username FROM users"):
            names[str(row["id"])] = row["username"]
    persona_names: dict[str, str] = {}
    with connect() as conn:
        for row in conn.execute("SELECT id, name FROM personas"):
            persona_names[row["id"]] = row["name"]
    out = []
    for r in rows:
        is_char = r["target_type"] == "character"
        reported_name = (
            persona_names.get(r["reported_id"], "unknown")
            if is_char
            else names.get(r["reported_id"], "unknown")
        )
        out.append(
            {
                "reporter_id": r["reporter_id"],
                "reporter_name": names.get(r["reporter_id"], "unknown"),
                "reported_id": r["reported_id"],
                "reported_name": reported_name,
                "target_type": r["target_type"],
                "reason": r["reason"],
                "created_at": r["created_at"],
            }
        )
    return out


@router.get("/chat-models")
def admin_chat_models(req: Request):
    _guard(req)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT key, label, COALESCE(description,'') AS description,
                   COALESCE(prompt_tier1,'') AS prompt_tier1,
                   COALESCE(prompt_tier2,'') AS prompt_tier2,
                   COALESCE(sort_order,0) AS sort_order
            FROM chat_models ORDER BY sort_order, key
            """
        ).fetchall()
    return [dict(r) for r in rows]


@router.put("/chat-models/{key}")
async def admin_update_chat_model(key: str, req: Request):
    _guard(req)
    body = await req.json()
    label = str(body.get("label") or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="label required")
    description = str(body.get("description") or "").strip()
    prompt_tier1 = str(body.get("prompt_tier1") or "").strip()
    prompt_tier2 = str(body.get("prompt_tier2") or "").strip()
    sort_order = int(body.get("sort_order") or 0)
    with connect() as conn:
        exists = conn.execute(
            "SELECT key FROM chat_models WHERE key=?", (key,)
        ).fetchone()
        if not exists:
            conn.execute(
                """
                INSERT INTO chat_models
                    (key, label, description, prompt_tier1, prompt_tier2, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (key, label, description, prompt_tier1, prompt_tier2, sort_order),
            )
        else:
            conn.execute(
                """
                UPDATE chat_models
                SET label=?, description=?, prompt_tier1=?, prompt_tier2=?, sort_order=?
                WHERE key=?
                """,
                (label, description, prompt_tier1, prompt_tier2, sort_order, key),
            )
        conn.commit()
    return {"ok": True}


@router.delete("/personas/{pid}")
def admin_delete_persona(pid: str, req: Request):
    _guard(req)
    with connect() as conn:
        row = conn.execute(
            "SELECT avatar_url FROM personas WHERE id=?", (pid,)
        ).fetchone()
        if not row:
            return {"error": "not found"}
        conn.execute("DELETE FROM personas WHERE id=?", (pid,))
        conn.execute("DELETE FROM conversations WHERE persona_id=?", (pid,))
        conn.execute("DELETE FROM persona_reactions WHERE persona_id=?", (pid,))
        conn.execute("DELETE FROM persona_favorites WHERE persona_id=?", (pid,))
        conn.commit()
    if row["avatar_url"]:
        file_path = Path(__file__).resolve().parent.parent / "uploads" / os.path.basename(row["avatar_url"])
        if file_path.exists():
            file_path.unlink()
    return {"ok": True}


@router.delete("/reports/{reporter_id}/{reported_id}")
def admin_delete_report(reporter_id: str, reported_id: str, req: Request):
    _guard(req)
    with connect() as conn:
        conn.execute(
            "DELETE FROM user_reports WHERE reporter_id=? AND reported_id=?",
            (reporter_id, reported_id),
        )
        conn.commit()
    return {"ok": True}


@router.delete("/users/{uid}")
def admin_delete_user(uid: str, req: Request):
    _guard(req)
    uid_int = int(uid)
    avatar_url = ""
    with auth_conn() as auth:
        row = auth.execute("SELECT avatar_url FROM users WHERE id=?", (uid_int,)).fetchone()
        if row:
            avatar_url = row["avatar_url"] or ""
        auth.execute("DELETE FROM sessions WHERE user_id=?", (uid_int,))
        auth.execute("DELETE FROM users WHERE id=?", (uid_int,))
        auth.commit()
    with connect() as conn:
        persona_ids = [
            r["id"]
            for r in conn.execute("SELECT id FROM personas WHERE user_id=?", (uid,)).fetchall()
        ]
        conn.execute("DELETE FROM conversations WHERE user_id=?", (uid,))
        conn.execute("DELETE FROM personas WHERE user_id=?", (uid,))
        conn.execute("DELETE FROM persona_reactions WHERE user_id=?", (uid,))
        conn.execute("DELETE FROM persona_favorites WHERE user_id=?", (uid,))
        conn.execute(
            "DELETE FROM user_follows WHERE follower_id=? OR following_id=?", (uid, uid)
        )
        conn.execute(
            "DELETE FROM user_favorites WHERE user_id=? OR creator_id=?", (uid, uid)
        )
        conn.execute(
            "DELETE FROM user_reports WHERE reporter_id=? OR reported_id=?", (uid, uid)
        )
        for pid in persona_ids:
            conn.execute("DELETE FROM conversations WHERE persona_id=?", (pid,))
            conn.execute("DELETE FROM persona_reactions WHERE persona_id=?", (pid,))
            conn.execute("DELETE FROM persona_favorites WHERE persona_id=?", (pid,))
            conn.execute("SELECT avatar_url FROM personas WHERE id=?", (pid,))
        conn.commit()
    if avatar_url:
        file_path = Path(__file__).resolve().parent.parent / "uploads" / os.path.basename(avatar_url)
        if file_path.exists():
            file_path.unlink()
    return {"ok": True}