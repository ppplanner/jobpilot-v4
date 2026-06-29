"""
日历自定义事件 CRUD
用户可直接在日历上添加面试/截止/备考/其他事件，独立于投递看板数据
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from core.database import get_db

router = APIRouter()


class CustomEventCreate(BaseModel):
    date: str
    title: str
    type: str = "其他"
    time: str = ""


class CustomEventUpdate(BaseModel):
    date: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    time: Optional[str] = None


class CustomEventOut(BaseModel):
    id: int
    date: str
    title: str
    type: str
    time: str
    created_at: str


@router.get("/", response_model=List[CustomEventOut])
def get_all_events():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM custom_calendar_events ORDER BY date ASC, time ASC"
        ).fetchall()
        return [dict(row) for row in rows]


@router.post("/", response_model=CustomEventOut)
def create_event(data: CustomEventCreate):
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO custom_calendar_events (date, title, type, time) VALUES (?, ?, ?, ?)",
            (data.date, data.title, data.type, data.time),
        )
        row = db.execute(
            "SELECT * FROM custom_calendar_events WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict(row)


@router.put("/{event_id}", response_model=CustomEventOut)
def update_event(event_id: int, data: CustomEventUpdate):
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="没有需要更新的字段")
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    with get_db() as db:
        db.execute(
            f"UPDATE custom_calendar_events SET {set_clause} WHERE id = ?",
            list(fields.values()) + [event_id],
        )
        row = db.execute(
            "SELECT * FROM custom_calendar_events WHERE id = ?", (event_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="事件不存在")
        return dict(row)


@router.delete("/{event_id}")
def delete_event(event_id: int):
    with get_db() as db:
        row = db.execute(
            "SELECT id FROM custom_calendar_events WHERE id = ?", (event_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="事件不存在")
        db.execute("DELETE FROM custom_calendar_events WHERE id = ?", (event_id,))
        return {"message": f"已删除事件 {event_id}"}
