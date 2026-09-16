import sqlite3
from contextlib import contextmanager

from config import CHAT_MODELS, DB_PATH


def init_db() -> None:
    with connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                persona_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS personas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                title TEXT,
                system_prompt TEXT NOT NULL,
                about TEXT,
                greeting TEXT,
                personality TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        for col in ("about", "greeting", "persona_id", "user_id"):
            try:
                cur.execute(f"ALTER TABLE conversations ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                pass
        for col in ("about", "greeting", "personality", "title"):
            try:
                cur.execute(f"ALTER TABLE personas ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                pass
        try:
            cur.execute("ALTER TABLE personas ADD COLUMN created_by TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            
            cur.execute("ALTER TABLE personas ADD COLUMN avatar_url TEXT")
        except sqlite3.OperationalError:
            pass
        for col in ("regenerate_count", "regenerate_index"):
            try:
                cur.execute(f"ALTER TABLE messages ADD COLUMN {col} INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
        for col in ("display_name", "about_me"):
            try:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError:
                pass
        try:
            cur.execute("ALTER TABLE personas ADD COLUMN likes INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            cur.execute("ALTER TABLE personas ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cur.execute("ALTER TABLE personas ADD COLUMN dislikes INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            cur.execute("ALTER TABLE personas ADD COLUMN categories TEXT")
        except sqlite3.OperationalError:
            pass
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS persona_reactions (
                persona_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (persona_id, user_id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                name TEXT PRIMARY KEY
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS persona_favorites (
                persona_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (persona_id, user_id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_follows (
                follower_id TEXT NOT NULL,
                following_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (follower_id, following_id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_favorites (
                user_id TEXT NOT NULL,
                creator_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, creator_id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_reports (
                reporter_id TEXT NOT NULL,
                reported_id TEXT NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL,
                target_type TEXT NOT NULL DEFAULT 'user',
                PRIMARY KEY (reporter_id, reported_id, target_type)
            )
            """
        )
        # Migrasi: tambah kolom target_type ke tabel lama
        try:
            cur.execute("ALTER TABLE user_reports ADD COLUMN target_type TEXT NOT NULL DEFAULT 'user'")
        except sqlite3.OperationalError:
            pass
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_models (
                key TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                prompt_tier1 TEXT NOT NULL DEFAULT '',
                prompt_tier2 TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        seed_categories(cur)
        seed_chat_models(cur)
        conn.commit()


def seed_categories(cur) -> None:
    default_categories = [
        "Anime",
        "Fantasy",
        "Action",
        "School",
        "Romance",
        "Sci-Fi",
        "Horror",
        "Mystery",
        "Comedy",
        "Drama",
        "Adventure",
        "Slice of Life",
        "Supernatural",
        "Sports",
        "Historical",
        "Mecha",
        "Game",
        "Original",
    ]
    cur.executemany(
        "INSERT OR IGNORE INTO categories (name) VALUES (?)",
        [(name,) for name in default_categories],
    )


def seed_chat_models(cur) -> None:
    # Sumber utama = config.py. Tiap start, config di-upsert ke DB sehingga
    # edit konfigurasi otomatis ikut ke panel/chat.
    cur.executemany(
        """
        INSERT INTO chat_models
            (key, label, description, prompt_tier1, prompt_tier2, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            label=excluded.label,
            description=excluded.description,
            prompt_tier1=excluded.prompt_tier1,
            prompt_tier2=excluded.prompt_tier2,
            sort_order=excluded.sort_order
        """,
        [
            (
                m["key"],
                m["label"],
                m.get("description", ""),
                m.get("prompt_tier1", ""),
                m.get("prompt_tier2", ""),
                m.get("sort_order", 0),
            )
            for m in CHAT_MODELS
        ],
    )


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
