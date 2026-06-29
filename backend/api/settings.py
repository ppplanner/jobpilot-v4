import os
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
_rt = {
    "api_key": os.getenv("LLM_API_KEY", ""),
    "base_url": os.getenv("LLM_BASE_URL", "https://api.deepseek.com"),
    "model": os.getenv("LLM_MODEL", "deepseek-chat"),
}


class APISettings(BaseModel):
    api_key: str
    base_url: str = "https://api.deepseek.com"
    model: str = "deepseek-chat"


@router.get("/api-key")
def get_api_key():
    return {"base_url": _rt["base_url"], "model": _rt["model"], "has_key": bool(_rt["api_key"])}


@router.put("/api-key")
def set_api_key(body: APISettings):
    key, base, model = body.api_key.strip(), body.base_url.strip(), body.model.strip()
    _rt["api_key"] = key
    _rt["base_url"] = base
    _rt["model"] = model
    os.environ["LLM_API_KEY"] = key
    os.environ["LLM_BASE_URL"] = base
    os.environ["LLM_MODEL"] = model
    lines = ENV_FILE.read_text(encoding="utf-8").splitlines() if ENV_FILE.exists() else []
    written = {"LLM_API_KEY": False, "LLM_BASE_URL": False, "LLM_MODEL": False}
    new = []
    for line in lines:
        matched = False
        for pfx in written:
            if line.startswith(pfx + "="):
                v = key if pfx == "LLM_API_KEY" else (base if pfx == "LLM_BASE_URL" else model)
                new.append(f"{pfx}={v}")
                written[pfx] = True
                matched = True
                break
        if not matched:
            new.append(line)
    for pfx, done in written.items():
        if not done:
            v = key if pfx == "LLM_API_KEY" else (base if pfx == "LLM_BASE_URL" else model)
            new.append(f"{pfx}={v}")
    ENV_FILE.write_text("\n".join(new) + "\n", encoding="utf-8")
    try:
        from core.config import settings as _s
        # 直接更新 pydantic Settings 单例，使 resume.py 等直接读 settings 的模块立即生效
        _s.__dict__["llm_api_key"]  = key
        _s.__dict__["llm_base_url"] = base
        _s.__dict__["llm_model"]    = model
    except Exception:
        pass
    return {"status": "ok", "message": "API Key updated"}
