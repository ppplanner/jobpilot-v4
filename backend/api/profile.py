"""
求职档案 API
- 基本信息 CRUD
- 实习经历 CRUD
- 项目经历 CRUD
- 技能标签 CRUD
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.database import get_db

router = APIRouter()


# ==================== 基本信息 ====================

@router.get("/basic")
def get_basic_info():
    """获取基本信息"""
    with get_db() as db:
        row = db.execute("SELECT * FROM profile_basic WHERE id = 1").fetchone()
        return dict(row) if row else {}


class BasicInfoUpdate(BaseModel):
    name: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None
    degree: Optional[str] = None
    gpa: Optional[str] = None
    graduation: Optional[str] = None
    target_role: Optional[str] = None
    target_city: Optional[str] = None
    self_intro: Optional[str] = None


@router.put("/basic")
def update_basic_info(data: BasicInfoUpdate):
    """保存/更新基本信息（upsert）"""
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        return {"message": "没有需要更新的字段"}

    with get_db() as db:
        existing = db.execute("SELECT id FROM profile_basic WHERE id = 1").fetchone()
        if existing:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            db.execute(f"UPDATE profile_basic SET {set_clause} WHERE id = 1", list(fields.values()))
        else:
            cols = ", ".join(fields.keys())
            placeholders = ", ".join("?" for _ in fields)
            db.execute(f"INSERT INTO profile_basic (id, {cols}) VALUES (1, {placeholders})", list(fields.values()))
        return {"message": "基本信息已保存"}


# ==================== 实习经历 ====================

@router.get("/internships")
def get_internships():
    """获取所有实习经历"""
    with get_db() as db:
        rows = db.execute("SELECT * FROM profile_internship ORDER BY sort_order, id DESC").fetchall()
        return [dict(r) for r in rows]


class InternshipCreate(BaseModel):
    company: str
    position: str
    start_date: str = ""
    end_date: str = ""
    is_current: int = 0
    department: str = ""
    highlights: str = ""


@router.post("/internships")
def add_internship(data: InternshipCreate):
    """添加实习经历"""
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO profile_internship (company, position, start_date, end_date, is_current, department, highlights) VALUES (?,?,?,?,?,?,?)",
            (data.company, data.position, data.start_date, data.end_date, data.is_current, data.department, data.highlights)
        )
        return {"id": cursor.lastrowid}


@router.put("/internships/{item_id}")
def update_internship(item_id: int, data: InternshipCreate):
    """更新实习经历"""
    with get_db() as db:
        db.execute(
            "UPDATE profile_internship SET company=?, position=?, start_date=?, end_date=?, is_current=?, department=?, highlights=? WHERE id=?",
            (data.company, data.position, data.start_date, data.end_date, data.is_current, data.department, data.highlights, item_id)
        )
        return {"message": "已更新"}


@router.delete("/internships/{item_id}")
def delete_internship(item_id: int):
    """删除实习经历"""
    with get_db() as db:
        db.execute("DELETE FROM profile_internship WHERE id = ?", (item_id,))
        return {"message": "已删除"}


# ==================== 项目经历 ====================

@router.get("/projects")
def get_projects():
    """获取所有项目经历"""
    with get_db() as db:
        rows = db.execute("SELECT * FROM profile_project ORDER BY sort_order, id DESC").fetchall()
        return [dict(r) for r in rows]


class ProjectCreate(BaseModel):
    name: str
    role: str
    start_date: str = ""
    end_date: str = ""
    background: str = ""
    contribution: str = ""
    result: str = ""
    tech_stack: str = ""


@router.post("/projects")
def add_project(data: ProjectCreate):
    """添加项目经历"""
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO profile_project (name, role, start_date, end_date, background, contribution, result, tech_stack) VALUES (?,?,?,?,?,?,?,?)",
            (data.name, data.role, data.start_date, data.end_date, data.background, data.contribution, data.result, data.tech_stack)
        )
        return {"id": cursor.lastrowid}


@router.put("/projects/{item_id}")
def update_project(item_id: int, data: ProjectCreate):
    """更新项目经历"""
    with get_db() as db:
        db.execute(
            "UPDATE profile_project SET name=?, role=?, start_date=?, end_date=?, background=?, contribution=?, result=?, tech_stack=? WHERE id=?",
            (data.name, data.role, data.start_date, data.end_date, data.background, data.contribution, data.result, data.tech_stack, item_id)
        )
        return {"message": "已更新"}


@router.delete("/projects/{item_id}")
def delete_project(item_id: int):
    """删除项目经历"""
    with get_db() as db:
        db.execute("DELETE FROM profile_project WHERE id = ?", (item_id,))
        return {"message": "已删除"}


# ==================== 技能标签 ====================

@router.get("/skills")
def get_skills():
    """获取所有技能标签"""
    with get_db() as db:
        rows = db.execute("SELECT * FROM profile_skill ORDER BY category, sort_order").fetchall()
        return [dict(r) for r in rows]


class SkillCreate(BaseModel):
    category: str
    skill_name: str
    level: str = "熟练"


@router.post("/skills")
def add_skill(data: SkillCreate):
    """添加技能标签"""
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO profile_skill (category, skill_name, level) VALUES (?,?,?)",
            (data.category, data.skill_name, data.level)
        )
        return {"id": cursor.lastrowid}


@router.delete("/skills/{skill_id}")
def delete_skill(skill_id: int):
    """删除技能标签"""
    with get_db() as db:
        db.execute("DELETE FROM profile_skill WHERE id = ?", (skill_id,))
        return {"message": "已删除"}
