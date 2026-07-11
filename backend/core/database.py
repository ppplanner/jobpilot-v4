"""
数据库连接配置 + 自动建表

双模式支持：
  - 本地开发：SQLite（无需配置）
  - 线上生产：PostgreSQL（设置 DATABASE_URL 环境变量）

DATABASE_URL 格式：postgresql://user:password@host/dbname
不设置则自动使用 SQLite。
"""
import os
import datetime
import sqlite3
from pathlib import Path
from contextlib import contextmanager

# ===== 检测数据库类型 =====
try:
    from core.config import settings
    _DATABASE_URL = settings.database_url or os.environ.get("DATABASE_URL", "")
except Exception:
    _DATABASE_URL = os.environ.get("DATABASE_URL", "")
IS_POSTGRES = _DATABASE_URL.startswith("postgres")

if IS_POSTGRES:
    import psycopg2
    import psycopg2.extras
    import psycopg2.pool
    # 连接池:复用与云端 Postgres 的连接,避免每个请求都重新建连(SSL 握手 ~1-2s)导致首页多接口串行卡顿
    _PG_POOL = None
    def _get_pg_pool():
        global _PG_POOL
        if _PG_POOL is None:
            _PG_POOL = psycopg2.pool.ThreadedConnectionPool(1, 8, dsn=_DATABASE_URL)
        return _PG_POOL
else:
    _BACKEND_DIR = Path(__file__).resolve().parent.parent
    _DATA_DIR = _BACKEND_DIR / "data"
    _DATA_DIR.mkdir(exist_ok=True)
    DB_PATH = os.environ.get("SQLITE_DB_PATH") or str(_DATA_DIR / "jobpilot.db")


# ===== 兼容性包装层（让所有 API 文件无需修改）=====

class _Row(dict):
    """同时支持列名和位置索引(row['col'] 与 row[0]),对齐 sqlite3.Row 行为，
    让依赖位置索引(如 fetchone()[0] 取 COUNT)的现有代码在 Postgres 下也能工作。"""
    def __getitem__(self, k):
        if isinstance(k, int):
            return list(self.values())[k]
        return super().__getitem__(k)


def _pg_row_to_dict(row):
    """PostgreSQL RealDictRow → _Row（双索引），datetime 转字符串保持与 SQLite 一致"""
    if row is None:
        return None
    result = _Row()
    for key, value in row.items():
        if isinstance(value, (datetime.datetime, datetime.date)):
            result[key] = str(value)[:19]
        else:
            result[key] = value
    return result


class _CursorWrapper:
    """统一 sqlite3.Cursor 和 psycopg2.Cursor 的接口"""

    def __init__(self, cursor, is_postgres: bool, lastrowid=None):
        self._c = cursor
        self._pg = is_postgres
        self.lastrowid = lastrowid

    def fetchall(self):
        rows = self._c.fetchall()
        if self._pg:
            return [_pg_row_to_dict(r) for r in rows]
        return rows

    def fetchone(self):
        row = self._c.fetchone()
        if self._pg:
            return _pg_row_to_dict(row)
        return row

    @property
    def rowcount(self):
        return self._c.rowcount


class _DBWrapper:
    """统一 SQLite conn 和 psycopg2 conn 的操作接口

    核心功能：
    - ? 占位符自动转换为 %s（PostgreSQL 需要）
    - INSERT 语句自动追加 RETURNING id，支持 lastrowid
    - executescript 拆分为单条语句执行（PostgreSQL 不支持 executescript）
    """

    def __init__(self, conn, is_postgres: bool):
        self._conn = conn
        self._pg = is_postgres

    def execute(self, sql: str, params=None):
        if self._pg:
            pg_sql = sql.replace("?", "%s")
            is_insert = pg_sql.strip().upper().startswith("INSERT")
            if is_insert and "RETURNING" not in pg_sql.upper():
                pg_sql = pg_sql.rstrip().rstrip(";") + " RETURNING id"

            cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(pg_sql, params or ())

            lastrowid = None
            if is_insert:
                row = cur.fetchone()
                lastrowid = row["id"] if row else None

            return _CursorWrapper(cur, is_postgres=True, lastrowid=lastrowid)
        else:
            cur = self._conn.execute(sql, params or ())
            return _CursorWrapper(cur, is_postgres=False, lastrowid=cur.lastrowid)

    def executescript(self, sql: str):
        if self._pg:
            cur = self._conn.cursor()
            for stmt in sql.split(";"):
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    try:
                        cur.execute(stmt)
                    except Exception:
                        self._conn.rollback()
        else:
            self._conn.executescript(sql)


# ===== 连接上下文管理器 =====

@contextmanager
def get_db():
    if IS_POSTGRES:
        pool = _get_pg_pool()
        conn = pool.getconn()
        conn.autocommit = False
        ok = True
        try:
            yield _DBWrapper(conn, is_postgres=True)
            conn.commit()
        except Exception:
            ok = False
            try: conn.rollback()
            except Exception: pass
            raise
        finally:
            # 正常则把连接还回池复用;异常连接可能损坏,关闭丢弃避免污染池
            try:
                pool.putconn(conn, close=not ok)
            except Exception:
                try: conn.close()
                except Exception: pass
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=TRUNCATE")  # 不用 WAL：每次提交直接落盘主库，进程被强杀也不丢已提交数据
        conn.execute("PRAGMA synchronous=FULL")        # 确保写入物理磁盘
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield _DBWrapper(conn, is_postgres=False)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


# ===== SQLite 建表 DDL =====
_SQLITE_DDL = """
CREATE TABLE IF NOT EXISTS applications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    tier        TEXT DEFAULT '匹配',
    status      TEXT DEFAULT '已投递',
    applied_date TEXT,
    source      TEXT DEFAULT '',
    contact     TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    jd_url      TEXT DEFAULT '',
    jd_text     TEXT DEFAULT '',
    jd_score    INTEGER DEFAULT NULL,
    jd_summary  TEXT DEFAULT '',
    interview_at TEXT DEFAULT '',
    deadline    TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS resume_versions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    version_name   TEXT NOT NULL,
    content        TEXT NOT NULL,
    target_role    TEXT DEFAULT '产品经理',
    is_active      INTEGER DEFAULT 1,
    analysis_json  TEXT DEFAULT '',
    snapshot_json  TEXT DEFAULT '',
    application_id INTEGER DEFAULT NULL,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS profile_basic (
    id          INTEGER PRIMARY KEY,
    name        TEXT DEFAULT '',
    school      TEXT DEFAULT '',
    major       TEXT DEFAULT '',
    degree      TEXT DEFAULT '',
    gpa         TEXT DEFAULT '',
    graduation  TEXT DEFAULT '',
    target_role TEXT DEFAULT '产品经理',
    target_city TEXT DEFAULT '',
    self_intro  TEXT DEFAULT '',
    target_side TEXT DEFAULT '',
    target_direction TEXT DEFAULT '',
    target_industry TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS profile_internship (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    start_date  TEXT DEFAULT '',
    end_date    TEXT DEFAULT '',
    is_current  INTEGER DEFAULT 0,
    department  TEXT DEFAULT '',
    highlights  TEXT DEFAULT '',
    sort_order  INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_project (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    start_date   TEXT DEFAULT '',
    end_date     TEXT DEFAULT '',
    background   TEXT DEFAULT '',
    contribution TEXT DEFAULT '',
    result       TEXT DEFAULT '',
    tech_stack   TEXT DEFAULT '',
    sort_order   INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_skill (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    category   TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    level      TEXT DEFAULT '熟练',
    sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS interview_questions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    category         TEXT NOT NULL,
    question         TEXT NOT NULL,
    difficulty       TEXT DEFAULT '中等',
    companies        TEXT DEFAULT '[]',
    answer_framework TEXT DEFAULT '',
    sample_answer    TEXT DEFAULT '',
    key_points       TEXT DEFAULT '[]',
    common_mistakes  TEXT DEFAULT '[]',
    tags             TEXT DEFAULT '[]',
    source           TEXT DEFAULT '',
    created_at       TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS application_debriefs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id  INTEGER NOT NULL,
    round           TEXT DEFAULT '一面',
    interview_date  TEXT DEFAULT '',
    questions       TEXT DEFAULT '',
    self_score      INTEGER DEFAULT 3,
    went_wrong      TEXT DEFAULT '',
    interviewer_fb  TEXT DEFAULT '',
    created_at      TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question        TEXT NOT NULL,
    source_company  TEXT DEFAULT '',
    source_position TEXT DEFAULT '',
    source_round    TEXT DEFAULT '',
    application_id  INTEGER DEFAULT NULL,
    is_practiced    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS question_practice (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id  INTEGER NOT NULL,
    user_answer  TEXT DEFAULT '',
    is_correct   INTEGER,
    time_spent   INTEGER DEFAULT 0,
    practiced_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS custom_calendar_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    title      TEXT NOT NULL,
    type       TEXT DEFAULT '其他',
    time       TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
"""

# ===== PostgreSQL 建表 DDL（SERIAL 替换 AUTOINCREMENT，TO_CHAR 替换 datetime）=====
_POSTGRES_DDL = """
CREATE TABLE IF NOT EXISTS applications (
    id          SERIAL PRIMARY KEY,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    tier        TEXT DEFAULT '匹配',
    status      TEXT DEFAULT '已投递',
    applied_date TEXT,
    source      TEXT DEFAULT '',
    contact     TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    jd_url      TEXT DEFAULT '',
    jd_text     TEXT DEFAULT '',
    jd_score    INTEGER DEFAULT NULL,
    jd_summary  TEXT DEFAULT '',
    interview_at TEXT DEFAULT '',
    deadline    TEXT DEFAULT '',
    created_at  TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE TABLE IF NOT EXISTS resume_versions (
    id             SERIAL PRIMARY KEY,
    version_name   TEXT NOT NULL,
    content        TEXT NOT NULL,
    target_role    TEXT DEFAULT '产品经理',
    is_active      INTEGER DEFAULT 1,
    analysis_json  TEXT DEFAULT '',
    snapshot_json  TEXT DEFAULT '',
    application_id INTEGER DEFAULT NULL,
    created_at     TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE TABLE IF NOT EXISTS profile_basic (
    id          INTEGER PRIMARY KEY,
    name        TEXT DEFAULT '',
    school      TEXT DEFAULT '',
    major       TEXT DEFAULT '',
    degree      TEXT DEFAULT '',
    gpa         TEXT DEFAULT '',
    graduation  TEXT DEFAULT '',
    target_role TEXT DEFAULT '产品经理',
    target_city TEXT DEFAULT '',
    self_intro  TEXT DEFAULT '',
    target_side TEXT DEFAULT '',
    target_direction TEXT DEFAULT '',
    target_industry TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS profile_internship (
    id          SERIAL PRIMARY KEY,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    start_date  TEXT DEFAULT '',
    end_date    TEXT DEFAULT '',
    is_current  INTEGER DEFAULT 0,
    department  TEXT DEFAULT '',
    highlights  TEXT DEFAULT '',
    sort_order  INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_project (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    start_date   TEXT DEFAULT '',
    end_date     TEXT DEFAULT '',
    background   TEXT DEFAULT '',
    contribution TEXT DEFAULT '',
    result       TEXT DEFAULT '',
    tech_stack   TEXT DEFAULT '',
    sort_order   INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS profile_skill (
    id         SERIAL PRIMARY KEY,
    category   TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    level      TEXT DEFAULT '熟练',
    sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS interview_questions (
    id               SERIAL PRIMARY KEY,
    category         TEXT NOT NULL,
    question         TEXT NOT NULL,
    difficulty       TEXT DEFAULT '中等',
    companies        TEXT DEFAULT '[]',
    answer_framework TEXT DEFAULT '',
    sample_answer    TEXT DEFAULT '',
    key_points       TEXT DEFAULT '[]',
    common_mistakes  TEXT DEFAULT '[]',
    tags             TEXT DEFAULT '[]',
    source           TEXT DEFAULT '',
    created_at       TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE TABLE IF NOT EXISTS application_debriefs (
    id              SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL,
    round           TEXT DEFAULT '一面',
    interview_date  TEXT DEFAULT '',
    questions       TEXT DEFAULT '',
    self_score      INTEGER DEFAULT 3,
    went_wrong      TEXT DEFAULT '',
    interviewer_fb  TEXT DEFAULT '',
    created_at      TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_questions (
    id              SERIAL PRIMARY KEY,
    question        TEXT NOT NULL,
    source_company  TEXT DEFAULT '',
    source_position TEXT DEFAULT '',
    source_round    TEXT DEFAULT '',
    application_id  INTEGER DEFAULT NULL,
    is_practiced    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE TABLE IF NOT EXISTS question_practice (
    id           SERIAL PRIMARY KEY,
    question_id  INTEGER NOT NULL,
    user_answer  TEXT DEFAULT '',
    is_correct   INTEGER,
    time_spent   INTEGER DEFAULT 0,
    practiced_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE TABLE IF NOT EXISTS custom_calendar_events (
    id         SERIAL PRIMARY KEY,
    date       TEXT NOT NULL,
    title      TEXT NOT NULL,
    type       TEXT DEFAULT '其他',
    time       TEXT DEFAULT '',
    created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);
"""

# ===== 新列迁移（已包含在 DDL 里，仅针对存量旧数据库补列）=====
_SQLITE_MIGRATIONS = [
    "ALTER TABLE applications ADD COLUMN jd_score INTEGER DEFAULT NULL",
    "ALTER TABLE applications ADD COLUMN jd_summary TEXT DEFAULT ''",
    "ALTER TABLE resume_versions ADD COLUMN analysis_json TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN interview_at TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN deadline TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN jd_text TEXT DEFAULT ''",
    "ALTER TABLE resume_versions ADD COLUMN application_id INTEGER DEFAULT NULL",
    "ALTER TABLE resume_versions ADD COLUMN snapshot_json TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN target_side TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN target_direction TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN target_industry TEXT DEFAULT ''",
]

_POSTGRES_MIGRATIONS = [
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_score INTEGER DEFAULT NULL",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_summary TEXT DEFAULT ''",
    "ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS analysis_json TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_at TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS deadline TEXT DEFAULT ''",
    "ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_text TEXT DEFAULT ''",
    "ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS application_id INTEGER DEFAULT NULL",
    "ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS snapshot_json TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN IF NOT EXISTS target_side TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN IF NOT EXISTS target_direction TEXT DEFAULT ''",
    "ALTER TABLE profile_basic ADD COLUMN IF NOT EXISTS target_industry TEXT DEFAULT ''",
]


def _backup_db():
    """启动时备份 SQLite 库，保留最近若干份（防误删/损坏导致数据全失）。
    用 SQLite 官方 backup API，能完整包含数据（即使存在未合并的日志）。"""
    if IS_POSTGRES or not os.path.exists(DB_PATH):
        return
    import glob
    import time
    bdir = _DATA_DIR / "backups"
    bdir.mkdir(exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    dst = str(bdir / f"jobpilot_{ts}.db")
    try:
        src = sqlite3.connect(DB_PATH)
        out = sqlite3.connect(dst)
        with out:
            src.backup(out)
        out.close()
        src.close()
    except Exception as e:
        print(f"[DB] backup skipped: {e}")
        return
    keep = 15
    files = sorted(glob.glob(str(bdir / "jobpilot_*.db")))
    for old in files[:-keep]:
        try:
            os.remove(old)
        except Exception:
            pass
    print(f"[DB] backup saved -> {dst}")


_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_iq_category ON interview_questions(category)",
    "CREATE INDEX IF NOT EXISTS idx_qp_question ON question_practice(question_id)",
    "CREATE INDEX IF NOT EXISTS idx_qp_time ON question_practice(practiced_at)",
    "CREATE INDEX IF NOT EXISTS idx_rv_app ON resume_versions(application_id)",
    "CREATE INDEX IF NOT EXISTS idx_ad_app ON application_debriefs(application_id)",
    "CREATE INDEX IF NOT EXISTS idx_pq_app ON personal_questions(application_id)",
    "CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status)",
]


def _create_indexes():
    """创建常用索引（幂等；SQLite/Postgres 通用 CREATE INDEX IF NOT EXISTS）。"""
    if IS_POSTGRES:
        conn = psycopg2.connect(_DATABASE_URL)
        try:
            for s in _INDEXES:
                try:
                    cur = conn.cursor()
                    cur.execute(s)
                    conn.commit()
                except Exception:
                    conn.rollback()
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(DB_PATH)
        try:
            for s in _INDEXES:
                try:
                    conn.execute(s)
                except Exception:
                    pass
            conn.commit()
        finally:
            conn.close()


def init_db():
    """初始化数据库（幂等）"""
    _backup_db()
    if IS_POSTGRES:
        conn = psycopg2.connect(_DATABASE_URL)
        try:
            cur = conn.cursor()
            for stmt in (_POSTGRES_DDL + "").split(";"):
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    cur.execute(stmt)
            for sql in _POSTGRES_MIGRATIONS:
                try:
                    cur.execute(sql)
                except Exception:
                    conn.rollback()
                    cur = conn.cursor()
            conn.commit()
            print("[DB] PostgreSQL init OK")
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.executescript(_SQLITE_DDL)
            conn.commit()
            print(f"[DB] SQLite init OK: {DB_PATH}")
        finally:
            conn.close()
        _migrate_db()
    _create_indexes()


def _migrate_db():
    """SQLite 专用：为存量数据库补加新列（幂等）"""
    if IS_POSTGRES:
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        for sql in _SQLITE_MIGRATIONS:
            try:
                conn.execute(sql)
            except sqlite3.OperationalError:
                pass
        conn.commit()
    finally:
        conn.close()


def seed_questions_from_json(json_path: str):
    """增量导入面试题库（通用，SQLite 和 PostgreSQL 均适用）"""
    import json as _json

    try:
        with open(json_path, encoding="utf-8") as f:
            questions = _json.load(f)
    except FileNotFoundError:
        print(f"[DB] JSON not found: {json_path}")
        return

    added = skipped = 0
    with get_db() as db:
        for q in questions:
            existing = db.execute(
                "SELECT id FROM interview_questions WHERE question = ?",
                (q.get("question", ""),)
            ).fetchone()
            if existing:
                skipped += 1
                continue
            db.execute(
                """INSERT INTO interview_questions
                   (category, question, difficulty, companies,
                    answer_framework, sample_answer, key_points,
                    common_mistakes, tags, source)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    q.get("category", ""),
                    q.get("question", ""),
                    q.get("difficulty", "中等"),
                    _json.dumps(q.get("companies", []), ensure_ascii=False),
                    q.get("answer_framework", ""),
                    q.get("sample_answer", ""),
                    _json.dumps(q.get("key_points", []), ensure_ascii=False),
                    _json.dumps(q.get("common_mistakes", []), ensure_ascii=False),
                    _json.dumps(q.get("tags", []), ensure_ascii=False),
                    q.get("source", ""),
                ),
            )
            added += 1

    print(f"[DB] Questions: {added} added, {skipped} skipped.")
