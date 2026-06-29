"""
投递记录 API — 对应原来 jobpilot/utils/database.py 里的 app_* 函数

Python 对比学习（你已经会了）：
  原来：app_get_all()   →   现在：GET  /api/v1/applications
  原来：app_add(...)    →   现在：POST /api/v1/applications
  原来：app_update(...) →   现在：PUT  /api/v1/applications/{id}
  原来：app_delete(...) →   现在：DELETE /api/v1/applications/{id}
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from core.database import get_db
from schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationOut, ApplicationStats

router = APIRouter()


# ===== GET /api/v1/applications — 获取所有投递记录 =====
@router.get("/", response_model=List[ApplicationOut])
def get_all_applications():
    """获取所有投递记录"""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM applications ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


# ===== GET /api/v1/applications/stats — 获取统计数据 =====
@router.get("/stats", response_model=ApplicationStats)
def get_stats():
    """获取投递统计（总数、按状态分组、按档位分组）"""
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM applications").fetchone()[0]

        by_status_rows = db.execute(
            "SELECT status, COUNT(*) as cnt FROM applications GROUP BY status"
        ).fetchall()
        by_status = {row["status"]: row["cnt"] for row in by_status_rows}

        by_tier_rows = db.execute(
            "SELECT tier, COUNT(*) as cnt FROM applications GROUP BY tier"
        ).fetchall()
        by_tier = {row["tier"]: row["cnt"] for row in by_tier_rows}

        return {"total": total, "by_status": by_status, "by_tier": by_tier}


# ===== POST /api/v1/applications — 新增投递记录 =====
@router.post("/", response_model=ApplicationOut)
def create_application(data: ApplicationCreate):
    """新增一条投递记录"""
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO applications
               (company, position, tier, status, applied_date, source, contact, notes, jd_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.company, data.position, data.tier, data.status,
             data.applied_date, data.source, data.contact, data.notes, data.jd_url)
        )
        new_id = cursor.lastrowid
        row = db.execute("SELECT * FROM applications WHERE id = ?", (new_id,)).fetchone()
        return dict(row)


# ===== PUT /api/v1/applications/{id} — 更新投递记录 =====
@router.put("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: int, data: ApplicationUpdate):
    """更新投递记录（只更新传入的字段）"""
    # 只更新有值的字段（None 表示没传，不需要更新）
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="没有需要更新的字段")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [app_id]

    with get_db() as db:
        db.execute(f"UPDATE applications SET {set_clause} WHERE id = ?", values)
        row = db.execute("SELECT * FROM applications WHERE id = ?", (app_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
        return dict(row)


# ===== DELETE /api/v1/applications/{id} — 删除投递记录 =====
@router.delete("/{app_id}")
def delete_application(app_id: int):
    """删除投递记录"""
    with get_db() as db:
        row = db.execute("SELECT id FROM applications WHERE id = ?", (app_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
        db.execute("DELETE FROM applications WHERE id = ?", (app_id,))
        return {"message": f"已删除记录 {app_id}"}


class JDAnalysisUpdate(BaseModel):
    jd_score: Optional[int] = None
    jd_summary: str = ""


@router.put("/{app_id}/jd-analysis")
def save_jd_analysis(app_id: int, data: JDAnalysisUpdate):
    """保存 JD 匹配分析结果到投递记录"""
    with get_db() as db:
        if not db.execute("SELECT id FROM applications WHERE id = ?", (app_id,)).fetchone():
            raise HTTPException(status_code=404, detail="投递记录不存在")
        db.execute(
            "UPDATE applications SET jd_score = ?, jd_summary = ? WHERE id = ?",
            (data.jd_score, data.jd_summary, app_id)
        )
        row = db.execute("SELECT * FROM applications WHERE id = ?", (app_id,)).fetchone()
        return dict(row)


# ===== GET /api/v1/applications/calendar — 未来 14 天的日历事件 =====
@router.get("/calendar")
def get_calendar_events():
    """返回未来 14 天内有 interview_at 或 deadline 的投递事件，供首页日历使用"""
    from datetime import date, timedelta
    today = date.today()
    end = today + timedelta(days=14)

    with get_db() as db:
        rows = db.execute("SELECT * FROM applications ORDER BY created_at DESC").fetchall()

    events = []
    for row in rows:
        app = dict(row)
        # 面试/笔试事件
        if app.get("interview_at"):
            try:
                d = date.fromisoformat(app["interview_at"][:10])
                if today <= d <= end:
                    events.append({
                        "type": "interview",
                        "date": app["interview_at"][:10],
                        "time": app["interview_at"][11:16] if len(app["interview_at"]) > 10 else "",
                        "company": app["company"],
                        "position": app["position"],
                        "status": app["status"],
                        "app_id": app["id"],
                    })
            except ValueError:
                pass
        # 截止事件
        if app.get("deadline"):
            try:
                d = date.fromisoformat(app["deadline"][:10])
                if today <= d <= end:
                    events.append({
                        "type": "offer_deadline" if app["status"] == "Offer" else "deadline",
                        "date": app["deadline"][:10],
                        "time": "",
                        "company": app["company"],
                        "position": app["position"],
                        "status": app["status"],
                        "app_id": app["id"],
                    })
            except ValueError:
                pass

    events.sort(key=lambda e: e["date"])
    return events


# ===== 面试复盘 Schema =====
class DebriefCreate(BaseModel):
    round: str = "一面"
    interview_date: str = ""
    questions: str = ""
    self_score: int = 3
    went_wrong: str = ""
    interviewer_fb: str = ""


# ===== GET /api/v1/applications/{id}/debriefs — 获取某条投递的所有复盘 =====
@router.get("/{app_id}/debriefs")
def get_debriefs(app_id: int):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM application_debriefs WHERE application_id = ? ORDER BY created_at DESC",
            (app_id,)
        ).fetchall()
        return [dict(r) for r in rows]


# ===== POST /api/v1/applications/{id}/debriefs — 新增复盘 =====
@router.post("/{app_id}/debriefs")
def create_debrief(app_id: int, data: DebriefCreate):
    with get_db() as db:
        if not db.execute("SELECT id FROM applications WHERE id = ?", (app_id,)).fetchone():
            raise HTTPException(status_code=404, detail="投递记录不存在")
        cursor = db.execute(
            """INSERT INTO application_debriefs
               (application_id, round, interview_date, questions, self_score, went_wrong, interviewer_fb)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (app_id, data.round, data.interview_date, data.questions,
             data.self_score, data.went_wrong, data.interviewer_fb)
        )
        row = db.execute(
            "SELECT * FROM application_debriefs WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict(row)


# ===== DELETE /api/v1/applications/{id}/debriefs/{debrief_id} — 删除复盘 =====
@router.delete("/{app_id}/debriefs/{debrief_id}")
def delete_debrief(app_id: int, debrief_id: int):
    with get_db() as db:
        db.execute(
            "DELETE FROM application_debriefs WHERE id = ? AND application_id = ?",
            (debrief_id, app_id)
        )
        return {"message": "已删除"}
