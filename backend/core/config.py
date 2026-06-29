"""
全局配置 — 读取环境变量
.env 文件里放敏感信息（API Key 等），不要提交到 git
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

# .env 文件的绝对路径（config.py所在目录的上级，即 backend/ 目录）
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = str(_BACKEND_DIR / ".env")


class Settings(BaseSettings):
    # LLM 配置
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"

    # 数据库（云端 Postgres 连接串；为空则用本地 SQLite）
    database_url: str = ""

    # 应用配置
    app_name: str = "JobPilot"
    debug: bool = True

    # CORS 允许的前端地址
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = _ENV_FILE       # 绝对路径，不受工作目录影响
        env_file_encoding = "utf-8"
        extra = "ignore"


# 单例，全局使用
settings = Settings()
