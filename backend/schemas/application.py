"""
投递记录的数据结构定义
Pydantic = Python 的类型系统 + 自动验证，类似 dataclass 但更强
"""
from pydantic import BaseModel
from typing import Optional
from datetime import date


# ===== 请求体（前端发来的数据）=====

class ApplicationCreate(BaseModel):
    """新建投递记录"""
    company: str
    position: str
    tier: str = "匹配"           # 冲刺/匹配/保底
    status: str = "已投递"
    applied_date: str = ""
    source: str = "官网/APP"
    contact: str = ""
    notes: str = ""
    jd_url: str = ""
    interview_at: str = ""       # 下次面试/笔试时间（ISO 格式）
    deadline: str = ""           # 投递截止或 Offer 接受截止日期


class ApplicationUpdate(BaseModel):
    """更新投递记录（所有字段可选）"""
    company: Optional[str] = None
    position: Optional[str] = None
    tier: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[str] = None
    source: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None
    jd_url: Optional[str] = None
    interview_at: Optional[str] = None
    deadline: Optional[str] = None


# ===== 响应体（后端返回给前端的数据）=====

class ApplicationOut(BaseModel):
    """单条投递记录"""
    id: int
    company: str
    position: str
    tier: str
    status: str
    applied_date: str
    source: str
    contact: str
    notes: str
    jd_url: str
    interview_at: Optional[str] = ""
    deadline: Optional[str] = ""
    created_at: Optional[str] = None


class ApplicationStats(BaseModel):
    """投递统计数据"""
    total: int
    by_status: dict
    by_tier: dict
