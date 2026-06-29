"""把本地 SQLite 残留的用户数据迁移到当前 DATABASE_URL 指向的库(云端 Postgres)。

云迁移时只迁了题库,简历版本/素材库/投递留在了本地。此脚本补迁。
按关键字段去重,可安全重复运行。
运行：python tools/migrate_local_to_cloud.py
"""
import sqlite3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from core.database import get_db  # noqa: E402

LOCAL = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "jobpilot.db")


def main():
    src = sqlite3.connect(LOCAL)
    src.row_factory = sqlite3.Row
    rep = {}
    with get_db() as db:
        # applications（去重 by company+position），记录 old->new id
        app_map = {}
        n = 0
        for r in src.execute("SELECT * FROM applications"):
            ex = db.execute(
                "SELECT id FROM applications WHERE company=? AND position=?",
                (r["company"], r["position"]),
            ).fetchone()
            if ex:
                app_map[r["id"]] = ex["id"]
                continue
            cur = db.execute(
                """INSERT INTO applications
                   (company,position,tier,status,applied_date,source,contact,notes,
                    jd_url,jd_text,jd_score,jd_summary,interview_at,deadline)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (r["company"], r["position"], r["tier"], r["status"], r["applied_date"],
                 r["source"], r["contact"], r["notes"], r["jd_url"], r["jd_text"],
                 r["jd_score"], r["jd_summary"], r["interview_at"], r["deadline"]),
            )
            app_map[r["id"]] = cur.lastrowid
            n += 1
        rep["applications"] = n

        # resume_versions（去重 by version_name），application_id 用映射
        n = 0
        for r in src.execute("SELECT * FROM resume_versions"):
            if db.execute("SELECT id FROM resume_versions WHERE version_name=?", (r["version_name"],)).fetchone():
                continue
            appid = app_map.get(r["application_id"]) if r["application_id"] else None
            db.execute(
                """INSERT INTO resume_versions
                   (version_name,content,target_role,is_active,analysis_json,snapshot_json,application_id)
                   VALUES (?,?,?,?,?,?,?)""",
                (r["version_name"], r["content"], r["target_role"], r["is_active"],
                 r["analysis_json"], r["snapshot_json"], appid),
            )
            n += 1
        rep["resume_versions"] = n

        # profile_internship（去重 by company+position）
        n = 0
        for r in src.execute("SELECT * FROM profile_internship"):
            if db.execute("SELECT id FROM profile_internship WHERE company=? AND position=?", (r["company"], r["position"])).fetchone():
                continue
            db.execute(
                """INSERT INTO profile_internship
                   (company,position,start_date,end_date,is_current,department,highlights,sort_order)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (r["company"], r["position"], r["start_date"], r["end_date"],
                 r["is_current"], r["department"], r["highlights"], r["sort_order"]),
            )
            n += 1
        rep["internships"] = n

        # profile_project（去重 by name）
        n = 0
        for r in src.execute("SELECT * FROM profile_project"):
            if db.execute("SELECT id FROM profile_project WHERE name=?", (r["name"],)).fetchone():
                continue
            db.execute(
                """INSERT INTO profile_project
                   (name,role,start_date,end_date,background,contribution,result,tech_stack,sort_order)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (r["name"], r["role"], r["start_date"], r["end_date"], r["background"],
                 r["contribution"], r["result"], r["tech_stack"], r["sort_order"]),
            )
            n += 1
        rep["projects"] = n

        # profile_skill（去重 by category+skill_name）
        n = 0
        for r in src.execute("SELECT * FROM profile_skill"):
            if db.execute("SELECT id FROM profile_skill WHERE category=? AND skill_name=?", (r["category"], r["skill_name"])).fetchone():
                continue
            db.execute(
                "INSERT INTO profile_skill (category,skill_name,level,sort_order) VALUES (?,?,?,?)",
                (r["category"], r["skill_name"], r["level"], r["sort_order"]),
            )
            n += 1
        rep["skills"] = n

        # profile_basic（若本地有，upsert id=1）
        b = src.execute("SELECT * FROM profile_basic WHERE id=1").fetchone()
        if b and not db.execute("SELECT id FROM profile_basic WHERE id=1").fetchone():
            db.execute(
                """INSERT INTO profile_basic
                   (id,name,school,major,degree,gpa,graduation,target_role,target_city,self_intro)
                   VALUES (1,?,?,?,?,?,?,?,?,?)""",
                (b["name"], b["school"], b["major"], b["degree"], b["gpa"],
                 b["graduation"], b["target_role"], b["target_city"], b["self_intro"]),
            )
            rep["profile_basic"] = 1

    print("migrated:", rep)
    src.close()


if __name__ == "__main__":
    main()
