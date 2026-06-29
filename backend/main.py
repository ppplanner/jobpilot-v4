"""
JobPilot v2 - FastAPI 后端入口
运行方式: uvicorn main:app --reload --port 8000
"""
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

# 确保 backend/ 目录在 Python 路径里（无论从哪里启动 uvicorn）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import init_db, seed_questions_from_json

from api.resume import router as resume_router
from api.applications import router as applications_router
from api.profile import router as profile_router
from api.practice import router as practice_router
from api.ai import router as ai_router
from api.settings import router as settings_router
from api.calendar import router as calendar_router


# ========== Lifespan：启动时自动建表 + 导入题库 ==========
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 建表（幂等）
    init_db()
    # 2. 将 JSON 题库导入数据库（如果表为空才导入）
    # 题库JSON路径：backend/的上两级 → jobpilot-v2/ → jobpilot/data/
    # 同时兼容旧路径（多一级parent的情况）
    _base = Path(__file__).resolve().parent.parent
    _json = _base / "jobpilot" / "data" / "interview_questions.json"
    if not _json.exists():
        _json = _base.parent / "jobpilot" / "data" / "interview_questions.json"
    json_path = str(_json)
    seed_questions_from_json(json_path)
    print("[JobPilot] Backend started OK")
    yield
    print("[JobPilot] Backend shutdown")


app = FastAPI(
    title="JobPilot API",
    description="秋招助手后端 API",
    version="2.0.0",
    lifespan=lifespan,
)

# ========== CORS（支持局域网/公网测试）==========
# 从环境变量读取允许的前端域名，逗号分隔
# 默认允许 localhost 和局域网 192.168.x.x / 172.x.x.x 段
_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

# 局域网测试模式：允许所有来源（仅本地测试使用，生产请关闭）
_lan_mode = os.environ.get("LAN_MODE", "true").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _lan_mode else ALLOWED_ORIGINS,
    allow_credentials=False if _lan_mode else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 注册路由 ==========
app.include_router(resume_router,       prefix="/api/v1/resume",       tags=["简历"])
app.include_router(applications_router, prefix="/api/v1/applications",  tags=["投递"])
app.include_router(profile_router,      prefix="/api/v1/profile",       tags=["档案"])
app.include_router(practice_router,     prefix="/api/v1/practice",      tags=["刷题"])
app.include_router(ai_router,           prefix="/api/v1/ai",            tags=["AI"])
app.include_router(settings_router,     prefix="/api/v1/settings",      tags=["设置"])
app.include_router(calendar_router,     prefix="/api/v1/calendar",      tags=["日历"])


@app.get("/")
def root():
    return {"status": "ok", "message": "JobPilot API v2 running"}


@app.get("/health")
def health():
    """深度健康检查：验证DB可连接 + API Key已配置"""
    from core.database import get_db
    from core.config import settings
    db_ok = False
    try:
        with get_db() as db:
            db.execute("SELECT 1")
            db_ok = True
    except Exception as e:
        pass

    # 优先用settings（走.env文件），fallback到环境变量
    has_key = bool(settings.llm_api_key or os.environ.get("LLM_API_KEY", ""))
    return {
        "status": "healthy" if db_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "llm_configured": has_key,
    }
