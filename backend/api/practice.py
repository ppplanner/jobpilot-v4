"""
刷题中心 API — 题库来自 SQLite interview_questions 表
- 获取题目列表（按分类/关键词筛选）
- 获取单题详情
- 记录练习结果
- 获取练习统计
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.database import get_db

router = APIRouter()


def _row_to_dict(row) -> dict:
    """将 sqlite3.Row 转成可 JSON 化的 dict，同时解析 JSON 字段"""
    d = dict(row)
    for field in ("companies", "key_points", "common_mistakes", "tags"):
        if field in d and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = []
    return d


# ===== GET /api/v1/practice/questions =====
@router.get("/questions")
def get_questions(
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    获取面试题列表
    - category: 产品设计 / 商业分析 / 数据分析 / 行为面试
    - keyword: 关键词搜索（匹配题目文本和 tags）
    """
    with get_db() as db:
        conditions = []
        params: list = []

        if category:
            conditions.append("category = ?")
            params.append(category)

        if keyword:
            conditions.append("(question LIKE ? OR tags LIKE ?)")
            params.extend([f"%{keyword}%", f"%{keyword}%"])

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        total = db.execute(
            f"SELECT COUNT(*) FROM interview_questions {where}", params
        ).fetchone()[0]

        rows = db.execute(
            f"SELECT * FROM interview_questions {where} ORDER BY id LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

    return {
        "total": total,
        "questions": [_row_to_dict(r) for r in rows],
        "offset": offset,
        "limit": limit,
    }


# ===== GET /api/v1/practice/questions/{id} =====
@router.get("/questions/{question_id}")
def get_question(question_id: int):
    """获取单道题的详情（包含答案和解析）"""
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM interview_questions WHERE id = ?", (question_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"题目 {question_id} 不存在")

    return _row_to_dict(row)


# ===== POST /api/v1/practice/questions — 管理员添加题目 =====
class QuestionCreate(BaseModel):
    category: str
    question: str
    difficulty: str = "中等"
    companies: list = []
    answer_framework: str = ""
    sample_answer: str = ""
    key_points: list = []
    common_mistakes: list = []
    tags: list = []
    source: str = ""


@router.post("/questions")
def add_question(data: QuestionCreate):
    """添加新题目到数据库"""
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO interview_questions
               (category, question, difficulty, companies,
                answer_framework, sample_answer, key_points,
                common_mistakes, tags, source)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                data.category, data.question, data.difficulty,
                json.dumps(data.companies, ensure_ascii=False),
                data.answer_framework, data.sample_answer,
                json.dumps(data.key_points, ensure_ascii=False),
                json.dumps(data.common_mistakes, ensure_ascii=False),
                json.dumps(data.tags, ensure_ascii=False),
                data.source,
            )
        )
        return {"id": cursor.lastrowid, "message": "题目已添加"}


# ===== POST /api/v1/practice/records — 记录练习结果 =====
class PracticeRecord(BaseModel):
    question_id: int
    user_answer: str = ""
    is_correct: Optional[bool] = None
    time_spent: int = 0


@router.post("/records")
def add_practice_record(data: PracticeRecord):
    """记录一次练习结果"""
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO question_practice
               (question_id, user_answer, is_correct, time_spent)
               VALUES (?, ?, ?, ?)""",
            (data.question_id, data.user_answer, data.is_correct, data.time_spent)
        )
        return {"id": cursor.lastrowid, "message": "记录成功"}


# ===== GET /api/v1/practice/stats =====
@router.get("/stats")
def get_practice_stats():
    """获取练习统计"""
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM question_practice").fetchone()[0]
        correct = db.execute(
            "SELECT COUNT(*) FROM question_practice WHERE is_correct = 1"
        ).fetchone()[0]
        from datetime import datetime, timedelta
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        recent = db.execute(
            "SELECT COUNT(*) FROM question_practice WHERE practiced_at >= ?",
            (seven_days_ago,)
        ).fetchone()[0]
        q_total = db.execute(
            "SELECT COUNT(*) FROM interview_questions"
        ).fetchone()[0]

    return {
        "total_practiced": total,
        "correct_count": correct,
        "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
        "recent_7days": recent,
        "question_total": q_total,
    }


# ===== GET /api/v1/practice/categories =====
@router.get("/categories")
def get_categories():
    """获取所有题目分类及每类数量"""
    with get_db() as db:
        rows = db.execute(
            "SELECT category, COUNT(*) as count FROM interview_questions GROUP BY category ORDER BY count DESC"
        ).fetchall()
    return [{"category": r["category"], "count": r["count"]} for r in rows]


# ===== 个人练习清单接口 =====
class PersonalQuestionCreate(BaseModel):
    question: str
    source_company: str = ""
    source_position: str = ""
    source_round: str = ""
    application_id: Optional[int] = None


@router.get("/personal")
def get_personal_questions():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM personal_questions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("/personal")
def add_personal_question(data: PersonalQuestionCreate):
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="题目内容不能为空")
    with get_db() as db:
        cursor = db.execute(
            """INSERT INTO personal_questions (question, source_company, source_position, source_round, application_id)
               VALUES (?, ?, ?, ?, ?)""",
            (data.question.strip(), data.source_company, data.source_position,
             data.source_round, data.application_id)
        )
        row = db.execute("SELECT * FROM personal_questions WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@router.put("/personal/{pq_id}/practiced")
def toggle_practiced(pq_id: int):
    with get_db() as db:
        row = db.execute("SELECT is_practiced FROM personal_questions WHERE id = ?", (pq_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="题目不存在")
        new_val = 0 if row["is_practiced"] else 1
        db.execute("UPDATE personal_questions SET is_practiced = ? WHERE id = ?", (new_val, pq_id))
        return {"is_practiced": new_val}


@router.delete("/personal/{pq_id}")
def delete_personal_question(pq_id: int):
    with get_db() as db:
        db.execute("DELETE FROM personal_questions WHERE id = ?", (pq_id,))
        return {"message": "已删除"}
