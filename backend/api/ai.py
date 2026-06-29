"""
AI 通用对话 API
通用 chat 接口，供前端各功能模块调用
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


def build_user_context() -> str:
    """从数据库聚合用户当前求职状态，返回注入 system prompt 的上下文字符串。
    任何查询失败都静默忽略，保证 AI 对话不受影响。"""
    try:
        from core.database import get_db
        with get_db() as db:
            # 1. 基本信息
            profile = db.execute("SELECT * FROM profile_basic WHERE id = 1").fetchone()
            name = profile["name"] if profile and profile["name"] else ""
            target_role = profile["target_role"] if profile and profile["target_role"] else ""
            target_city = profile["target_city"] if profile and profile["target_city"] else ""

            # 2. 投递统计
            total = db.execute("SELECT COUNT(*) FROM applications").fetchone()[0]
            if total == 0:
                return ""

            by_status = db.execute(
                "SELECT status, COUNT(*) as cnt FROM applications GROUP BY status"
            ).fetchall()
            status_parts = [f"{r['status']}{r['cnt']}家" for r in by_status]

            # 近期进入面试或 Offer 阶段的公司（最多5个）
            active_apps = db.execute(
                """SELECT company, position, status FROM applications
                   WHERE status NOT IN ('已投递','已放弃','简历挂')
                   ORDER BY created_at DESC LIMIT 5"""
            ).fetchall()
            active_str = "、".join(
                f"{r['company']}({r['position']}·{r['status']})" for r in active_apps
            ) if active_apps else "暂无"

            # 3. 复盘薄弱点（went_wrong 非空，最近5条）
            debriefs = db.execute(
                """SELECT a.company, a.position, d.round, d.went_wrong
                   FROM application_debriefs d
                   JOIN applications a ON a.id = d.application_id
                   WHERE d.went_wrong != ''
                   ORDER BY d.created_at DESC LIMIT 5"""
            ).fetchall()

            lines = ["【用户当前求职状态】（仅供参考，无需向用户复述）"]
            if name or target_role:
                meta = []
                if name:        meta.append(f"姓名：{name}")
                if target_role: meta.append(f"目标岗位：{target_role}")
                if target_city: meta.append(f"目标城市：{target_city}")
                lines.append(" | ".join(meta))

            lines.append(f"投递总数：{total}家（{'、'.join(status_parts)}）")
            lines.append(f"近期活跃进展：{active_str}")

            if debriefs:
                weak = "；".join(
                    f"{r['company']}{r['round']}：{r['went_wrong'][:40]}" for r in debriefs
                )
                lines.append(f"复盘薄弱点：{weak}")

            return "\n".join(lines)
    except Exception:
        return ""


class ChatMessage(BaseModel):
    role: str       # "user" 或 "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    agent_type: str = "general"   # general / resume / interview / strategy / intel
    stream: bool = False


def _get_llm_cfg():
    """读取 LLM 配置，优先从 core.config.settings 读取（走 .env 文件）"""
    import os
    try:
        from core.config import settings
        key = settings.llm_api_key or os.environ.get("LLM_API_KEY", "")
        base = settings.llm_base_url or os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
        model = settings.llm_model or os.environ.get("LLM_MODEL", "deepseek-chat")
    except Exception:
        key = os.environ.get("LLM_API_KEY", "")
        base = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
        model = os.environ.get("LLM_MODEL", "deepseek-chat")
    return key, base, model


# ===== POST /api/v1/ai/chat — 通用对话（同步）=====
@router.post("/chat")
async def chat(req: ChatRequest):
    """通用 AI 对话接口"""
    from openai import OpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    system_prompts = {
        "general": (
            "你是 JobPilot 求职助手，服务对象是正在秋招的应届生产品经理候选人。\n\n"
            "工作风格：\n"
            "- 直接给出结论，不废话，不做虚假鼓励\n"
            "- 每次回复最多 300 字，用户主动要求展开时再补充\n"
            "- 有多个建议时用「1. 2. 3.」分点，不用无意义的「首先」「其次」\n\n"
            "禁止行为：\n"
            "- 不说「您好，我是XXX，很高兴为您服务」\n"
            "- 不用「赋能/闭环/打通/深度参与/推动落地」等空洞词\n"
            "- 不在不确定时装作确定"
        ),
        "resume": (
            "你是一位在字节/腾讯有 5 年以上校招招聘经验的 PM 简历顾问。\n\n"
            "工作风格：\n"
            "- 直接指出问题，不说废话，不给虚假鼓励\n"
            "- 每次给出最多 3 条建议，每条附上「原句 → 改句」具体示例\n"
            "- 用「原句：...」「改句：...」「原因：...」三行格式展示修改\n\n"
            "禁止行为：\n"
            "- 不捏造用户简历里没有的数字和经历\n"
            "- 不用「赋能/闭环/打通/深度参与/具有较强的」等空话\n"
            "- 不超过 300 字/次（用户可要求展开）"
        ),
        "interview": (
            "你是一位经历过 50+ 场 PM 面试的面试教练，擅长帮候选人拆解问题结构和打磨回答。\n\n"
            "工作风格：\n"
            "- 先给出问题的核心考察点（1 句话），再给答题框架，最后举例\n"
            "- 回答结构：考察点 → 框架 → 示例，三段走，不超过 400 字\n"
            "- 模拟追问时，从面试官视角出发，挑最容易挂掉候选人的点\n\n"
            "禁止行为：\n"
            "- 不给泛泛而谈的「万能答题模板」\n"
            "- 不说「这道题没有标准答案」然后就没了\n"
            "- 不用「积极/热爱/团队精神」等无法证伪的形容词"
        ),
        "strategy": (
            "你是一位跟进了 3 届秋招、熟悉头部互联网公司 PM 招聘节奏的求职策略顾问。\n\n"
            "工作风格：\n"
            "- 给出具体可执行的投递时间线和优先级排序\n"
            "- 区分「冲刺/匹配/保底」三档，帮候选人做风险分散\n"
            "- 信息不确定时直接说「我不确定该公司今年的节奏，建议查官网」\n\n"
            "禁止行为：\n"
            "- 不给「海投」这种没有针对性的建议\n"
            "- 不鼓励候选人虚报或夸大经历\n"
            "- 不承诺结果（「投这家一定过」之类）"
        ),
        "intel": (
            "你是一位专门研究互联网公司 PM 岗位招聘风格的情报分析师，"
            "信息来源包括公开 JD、往届面经和行业动态。\n\n"
            "工作风格：\n"
            "- 分「岗位方向/面试风格/高频考点/注意事项」四个维度输出\n"
            "- 每个维度 1-3 条，具体到可执行（如「该公司偏爱用数据案例，答题时务必带数字」）\n"
            "- 明确标注信息时效：「以下信息基于 2023-2024 年面经，仅供参考」\n\n"
            "禁止行为：\n"
            "- 不凭空捏造公司的具体题目或 Offer 数据\n"
            "- 信息过时时不假装是最新的"
        ),
    }
    system_content = system_prompts.get(req.agent_type, system_prompts["general"])
    ctx = build_user_context()
    if ctx:
        system_content = system_content + "\n\n" + ctx

    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(model=model, messages=messages)
    return {"content": response.choices[0].message.content}


# ===== POST /api/v1/ai/chat/stream — 通用对话（流式）=====
@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """流式 AI 对话，前端实时显示输出"""
    from openai import AsyncOpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    system_prompts = {
        "general": (
            "你是 JobPilot 求职助手，服务对象是正在秋招的应届生产品经理候选人。\n\n"
            "工作风格：\n"
            "- 直接给出结论，不废话，不做虚假鼓励\n"
            "- 每次回复最多 300 字，用户主动要求展开时再补充\n"
            "- 有多个建议时用「1. 2. 3.」分点\n\n"
            "禁止行为：\n"
            "- 不说「您好，我是XXX，很高兴为您服务」\n"
            "- 不用「赋能/闭环/打通/深度参与/推动落地」等空洞词\n"
            "- 不在不确定时装作确定"
        ),
        "resume": (
            "你是一位在字节/腾讯有 5 年以上校招招聘经验的 PM 简历顾问。\n\n"
            "工作风格：\n"
            "- 直接指出问题，不说废话，不给虚假鼓励\n"
            "- 每次给出最多 3 条建议，每条附上「原句 → 改句」具体示例\n"
            "- 用「原句：...」「改句：...」「原因：...」三行格式展示修改\n\n"
            "禁止行为：\n"
            "- 不捏造用户简历里没有的数字和经历\n"
            "- 不用「赋能/闭环/打通/深度参与/具有较强的」等空话\n"
            "- 不超过 300 字/次（用户可要求展开）"
        ),
        "interview": (
            "你是一位经历过 50+ 场 PM 面试的面试教练，擅长帮候选人拆解问题结构和打磨回答。\n\n"
            "工作风格：\n"
            "- 先给出问题的核心考察点（1 句话），再给答题框架，最后举例\n"
            "- 回答结构：考察点 → 框架 → 示例，三段走，不超过 400 字\n"
            "- 模拟追问时，从面试官视角出发，挑最容易挂掉候选人的点\n\n"
            "禁止行为：\n"
            "- 不给泛泛的「万能答题模板」\n"
            "- 不说「这道题没有标准答案」然后就没了\n"
            "- 不用「积极/热爱/团队精神」等无法证伪的形容词"
        ),
        "strategy": (
            "你是一位跟进了 3 届秋招、熟悉头部互联网公司 PM 招聘节奏的求职策略顾问。\n\n"
            "工作风格：\n"
            "- 给出具体可执行的投递时间线和优先级排序\n"
            "- 区分「冲刺/匹配/保底」三档，帮候选人做风险分散\n"
            "- 信息不确定时直接说「我不确定该公司今年的节奏，建议查官网」\n\n"
            "禁止行为：\n"
            "- 不给「海投」这种无针对性的建议\n"
            "- 不鼓励候选人虚报或夸大经历\n"
            "- 不承诺结果（「投这家一定过」之类）"
        ),
        "intel": (
            "你是一位专门研究互联网公司 PM 岗位招聘风格的情报分析师。\n\n"
            "工作风格：\n"
            "- 分「岗位方向/面试风格/高频考点/注意事项」四个维度输出\n"
            "- 每个维度 1-3 条，具体到可执行\n"
            "- 明确标注：「以下信息基于 2023-2024 年面经，仅供参考」\n\n"
            "禁止行为：\n"
            "- 不凭空捏造公司的具体题目或 Offer 数据\n"
            "- 信息过时时不假装是最新的"
        ),
    }
    system_content = system_prompts.get(req.agent_type, system_prompts["general"])
    ctx = build_user_context()
    if ctx:
        system_content = system_content + "\n\n" + ctx
    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def generate():
        async with client.chat.completions.stream(
            model=model,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    # Server-Sent Events 格式：data: <内容>\n\n
                    content = chunk.choices[0].delta.content
                    yield f"data: {content}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ===== POST /api/v1/ai/jd-profile — JD人才画像分析 =====
class JDProfileRequest(BaseModel):
    jd_text: str
    company: str = ""
    position: str = ""


@router.post("/jd-profile")
async def jd_profile(req: JDProfileRequest):
    """
    纯从JD角度解读招聘需求，不依赖简历内容。
    返回：PM方向、经验层级、核心能力维度、理想候选人画像、改写重点提示
    """
    import json
    import re
    from openai import OpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    prompt = f"""你是资深PM招聘顾问。请解读以下JD，告诉候选人这个岗位偏向什么样的人。

目标公司：{req.company or "未知"}
目标岗位：{req.position or "产品经理"}

【JD内容】
{req.jd_text[:3000]}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "pm_type": "B端PM",
  "experience_level": "应届/校招",
  "key_dimensions": [
    {{"name": "产品设计", "priority": "核心", "detail": "需要独立完成需求分析和PRD输出，有完整的产品设计案例"}},
    {{"name": "数据分析", "priority": "重要", "detail": "熟悉SQL，能独立取数做归因分析"}},
    {{"name": "行业经验", "priority": "加分", "detail": "有SaaS或企服行业背景优先"}}
  ],
  "ideal_profile": "有B端产品实习经验，了解企业软件业务流程，逻辑表达清晰，具备数据驱动思维",
  "rewrite_focus": "重点突出B端产品设计能力和业务理解深度，将实习中的需求分析、PRD产出、跨部门协作案例具体化"
}}

说明：
- pm_type只能是：B端PM / C端PM / 增长PM / 数据PM / AI PM / 通用PM 之一
- experience_level：应届/校招 / 1-3年 / 3-5年 / 5年以上
- key_dimensions最多4个，priority只能是：核心 / 重要 / 加分
- ideal_profile控制在50字以内
- rewrite_focus控制在60字以内，给候选人最直接的改写方向指引"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content

    match = re.search(r'\{.*\}', result_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise HTTPException(status_code=500, detail="JD解析失败，请重试")


# ===== POST /api/v1/ai/match-materials — JD与素材库经历匹配推荐 =====
class MatchMaterialsRequest(BaseModel):
    jd_text: str
    company: str = ""
    position: str = ""


@router.post("/match-materials")
async def match_materials(req: MatchMaterialsRequest):
    """对照用户素材库（实习/项目），推荐最匹配这份 JD 的经历。
    只返回 id + 匹配度 + 理由，经历正文由前端用 id 关联本地数据。"""
    import json
    import re
    from openai import OpenAI
    from core.database import get_db

    with get_db() as db:
        interns = [dict(r) for r in db.execute(
            "SELECT * FROM profile_internship ORDER BY sort_order, id DESC"
        ).fetchall()]
        projects = [dict(r) for r in db.execute(
            "SELECT * FROM profile_project ORDER BY sort_order, id DESC"
        ).fetchall()]

    if not interns and not projects:
        return {"internships": [], "projects": [], "empty": True}

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    intern_lines = []
    for i in interns:
        h = (i.get("highlights") or "")[:200]
        intern_lines.append(
            f"id={i['id']}｜{i.get('company','')} · {i.get('position','')}" + (f"｜{h}" if h else "")
        )
    project_lines = []
    for p in projects:
        parts = []
        bg = (p.get("background") or "")[:120]
        ct = (p.get("contribution") or "")[:120]
        rs = (p.get("result") or "")[:120]
        if bg: parts.append("背景:" + bg)
        if ct: parts.append("贡献:" + ct)
        if rs: parts.append("成果:" + rs)
        project_lines.append(
            f"id={p['id']}｜{p.get('name','')} · {p.get('role','')}" + (f"｜{' '.join(parts)}" if parts else "")
        )

    interns_block = "\n".join(intern_lines) if intern_lines else "（无）"
    projects_block = "\n".join(project_lines) if project_lines else "（无）"

    prompt = f"""你是资深PM招聘顾问。下面是一份岗位JD，以及候选人素材库里已有的实习经历和项目经历（每条都带 id）。
请判断每段经历与这份JD的匹配程度，按匹配度从高到低排序，并给出一句话理由（说明为什么匹配/不匹配这份JD的核心要求）。

目标公司：{req.company or "未知"}
目标岗位：{req.position or "产品经理"}

【JD内容】
{req.jd_text[:3000]}

【实习经历】
{interns_block}

【项目经历】
{projects_block}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "internships": [
    {{"id": 1, "match": "高", "reason": "该实习的B端需求分析经验直接命中JD的核心职责"}}
  ],
  "projects": [
    {{"id": 1, "match": "中", "reason": "项目的数据分析部分与JD相关，但行业不同"}}
  ]
}}

说明：
- 只使用上面给出的 id，不要编造 id，不要改写经历内容
- match 只能是：高 / 中 / 低
- reason 控制在40字以内，要具体指出与这份JD的关联点
- internships 和 projects 都要覆盖上面列出的全部经历，按匹配度从高到低排序"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content

    match = re.search(r"\{.*\}", result_text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            valid_intern_ids = {i["id"] for i in interns}
            valid_project_ids = {p["id"] for p in projects}
            data["internships"] = [x for x in data.get("internships", []) if x.get("id") in valid_intern_ids]
            data["projects"] = [x for x in data.get("projects", []) if x.get("id") in valid_project_ids]
            return data
        except json.JSONDecodeError:
            pass

    raise HTTPException(status_code=500, detail="经历匹配失败，请重试")


# ===== GET /api/v1/ai/tags — 返回受控标签词表(供前端展示/分组) =====
@router.get("/tags")
async def get_tag_catalog():
    """返回受控标签词表(唯一真源在 core/tags.py),前端据此展示与分组,无需自维护副本。"""
    from core.tags import all_tags_public, DOMAINS
    return {
        "domains": [{"id": k, "label": v[0], "weight": v[1]} for k, v in DOMAINS.items()],
        "tags": all_tags_public(),
    }


# ===== GET /api/v1/ai/my-tags — 我的能力标签(仅素材库,与JD无关) =====
@router.get("/my-tags")
async def my_tags():
    """仅从素材库(实习/项目/技能)聚合候选人的能力标签,映射到受控词表,
    每个标签带支撑素材 id 与强弱。供首页「能力胶囊」左列使用,与 JD 无关。"""
    import json
    import re
    from openai import OpenAI
    from core.database import get_db
    from core import tags as T

    with get_db() as db:
        interns = [dict(r) for r in db.execute(
            "SELECT * FROM profile_internship ORDER BY sort_order, id DESC"
        ).fetchall()]
        projects = [dict(r) for r in db.execute(
            "SELECT * FROM profile_project ORDER BY sort_order, id DESC"
        ).fetchall()]
        skills = [dict(r) for r in db.execute(
            "SELECT * FROM profile_skill ORDER BY sort_order, id DESC"
        ).fetchall()]

    if not interns and not projects and not skills:
        return {"my_tags": [], "empty": True}

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    mat_lines = []
    for i in interns:
        h = (i.get("highlights") or "")[:300]
        mat_lines.append(f"internship id={i['id']}｜{i.get('company','')}·{i.get('position','')}" + (f"｜{h}" if h else ""))
    for p in projects:
        parts = []
        for k, lbl in (("background", "背景"), ("contribution", "贡献"), ("result", "成果"), ("tech_stack", "技术栈")):
            v = (p.get(k) or "")[:120]
            if v:
                parts.append(f"{lbl}:{v}")
        mat_lines.append(f"project id={p['id']}｜{p.get('name','')}·{p.get('role','')}" + (f"｜{' '.join(parts)}" if parts else ""))
    if skills:
        sk = "、".join(f"{s.get('skill_name','')}({s.get('level','')})" for s in skills if s.get("skill_name"))
        mat_lines.append(f"skills｜{sk}")

    materials_block = "\n".join(mat_lines)
    catalog = T.build_tag_catalog_block()

    prompt = f"""你是资深PM招聘顾问。请基于下面的【受控标签词表】,从候选人素材库中提炼候选人**真正具备**的能力标签(my_tags)。
每个标签必须指出由哪几条素材支撑(materials),并标强弱:强/弱(有具体成果/数字=强,仅提及=弱)。

{catalog}

【候选人素材库】(每条带 type 与 id,materials 里只能引用这些 type+id)
{materials_block}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "my_tags": [
    {{"label": "需求分析", "strength": "强", "materials": [{{"type": "internship", "id": 1}}]}}
  ]
}}

规则：
- label 只能用词表里的标准标签;别名归并到标准标签;无法归类的直接丢弃。
- strength 只能是 强/弱;materials 只能引用上面列出的 type(internship/project)+id,技能不作跳转目标。
- 只输出真正有素材支撑的标签,不要凑数。"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model, temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    m = re.search(r"\{.*\}", response.choices[0].message.content, re.DOTALL)
    if not m:
        raise HTTPException(status_code=500, detail="能力标签提取失败，请重试")
    try:
        raw = json.loads(m.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="能力标签提取失败，请重试")

    valid_intern_ids = {i["id"] for i in interns}
    valid_project_ids = {p["id"] for p in projects}
    my_map = {}
    for item in raw.get("my_tags", []):
        tid = T.normalize(item.get("label", ""))
        if not tid:
            continue
        strength = item.get("strength") if item.get("strength") in ("强", "弱") else "强"
        refs = []
        for r in item.get("materials", []):
            rtype, rid = r.get("type"), r.get("id")
            if rtype == "internship" and rid in valid_intern_ids:
                refs.append({"type": "internship", "id": rid})
            elif rtype == "project" and rid in valid_project_ids:
                refs.append({"type": "project", "id": rid})
        t = T.get_tag(tid)
        if tid not in my_map:
            my_map[tid] = {"id": tid, "label": t["label"], "domain": t["domain"],
                           "strength": strength, "materials": refs}
        else:
            seen = {(x["type"], x["id"]) for x in my_map[tid]["materials"]}
            my_map[tid]["materials"] += [r for r in refs if (r["type"], r["id"]) not in seen]
            if strength == "强":
                my_map[tid]["strength"] = "强"

    return {"my_tags": list(my_map.values()), "empty": False}


# ===== POST /api/v1/ai/tag-match — JD需求标签 × 我的标签 命中分析 =====
class TagMatchRequest(BaseModel):
    jd_text: str
    company: str = ""
    position: str = ""


# 优先级 → 权重系数(用于加权匹配分)
_PRIORITY_FACTOR = {"核心": 3, "重要": 2, "加分": 1}


@router.post("/tag-match")
async def tag_match(req: TagMatchRequest):
    """对照受控词表,同时抽出:
    - JD 需求标签(带 核心/重要/加分 优先级)
    - 我的标签(由素材库聚合,每个标签关联支撑它的素材 id)
    后端做标签收口(别名→标准)、素材 id 校验、命中状态(命中/部分/缺口)与加权匹配分。
    """
    import json
    import re
    from openai import OpenAI
    from core.database import get_db
    from core import tags as T

    with get_db() as db:
        interns = [dict(r) for r in db.execute(
            "SELECT * FROM profile_internship ORDER BY sort_order, id DESC"
        ).fetchall()]
        projects = [dict(r) for r in db.execute(
            "SELECT * FROM profile_project ORDER BY sort_order, id DESC"
        ).fetchall()]
        skills = [dict(r) for r in db.execute(
            "SELECT * FROM profile_skill ORDER BY sort_order, id DESC"
        ).fetchall()]

    if not interns and not projects and not skills:
        return {"jd_tags": [], "my_tags": [], "gaps": [], "score": 0,
                "uncatalogued": [], "empty": True}

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    # 素材文本块(带 type+id,要求 LLM 回填关联)
    mat_lines = []
    for i in interns:
        h = (i.get("highlights") or "")[:300]
        mat_lines.append(f"internship id={i['id']}｜{i.get('company','')}·{i.get('position','')}" + (f"｜{h}" if h else ""))
    for p in projects:
        parts = []
        for k, lbl in (("background", "背景"), ("contribution", "贡献"), ("result", "成果"), ("tech_stack", "技术栈")):
            v = (p.get(k) or "")[:120]
            if v:
                parts.append(f"{lbl}:{v}")
        mat_lines.append(f"project id={p['id']}｜{p.get('name','')}·{p.get('role','')}" + (f"｜{' '.join(parts)}" if parts else ""))
    if skills:
        sk = "、".join(f"{s.get('skill_name','')}({s.get('level','')})" for s in skills if s.get("skill_name"))
        mat_lines.append(f"skills｜{sk}")  # 技能整体作背景,通常不单独作素材跳转目标

    materials_block = "\n".join(mat_lines)
    catalog = T.build_tag_catalog_block()

    prompt = f"""你是资深PM招聘顾问。请基于下面的【受控标签词表】,完成两件事:
1) 从 JD 中提取这个岗位要求的能力标签(jd_tags),每个标注优先级:核心/重要/加分;
2) 从候选人素材库中提炼候选人具备的能力标签(my_tags),每个标签必须指出由哪几条素材支撑(materials),并标注强弱:强/弱(有具体成果/数字=强,仅提及=弱)。

{catalog}

目标公司：{req.company or "未知"}
目标岗位：{req.position or "产品经理"}

【JD内容】
{req.jd_text[:2500]}

【候选人素材库】(每条带 type 与 id,materials 里只能引用这些 type+id)
{materials_block}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "jd_tags": [
    {{"label": "数据分析", "priority": "核心"}},
    {{"label": "B端产品", "priority": "重要"}}
  ],
  "my_tags": [
    {{"label": "需求分析", "strength": "强", "materials": [{{"type": "internship", "id": 1}}]}},
    {{"label": "竞品分析", "strength": "弱", "materials": [{{"type": "project", "id": 2}}]}}
  ],
  "uncatalogued": ["词表里没有但JD反复强调的词"]
}}

规则：
- label 只能用上面词表里的标准标签;含义相同的别名请归并到标准标签;无法归类的放进 uncatalogued。
- priority 只能是 核心/重要/加分;strength 只能是 强/弱。
- my_tags 的 materials 只能引用上面列出的 type(internship/project)+id,技能不作跳转目标。
- 只输出真正有素材支撑的 my_tags,不要为了凑数硬套。"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content
    m = re.search(r"\{.*\}", result_text, re.DOTALL)
    if not m:
        raise HTTPException(status_code=500, detail="标签匹配失败，请重试")
    try:
        raw = json.loads(m.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="标签匹配失败，请重试")

    valid_intern_ids = {i["id"] for i in interns}
    valid_project_ids = {p["id"] for p in projects}

    def _meta(tid: str) -> dict:
        t = T.get_tag(tid)
        return {"id": tid, "label": t["label"], "domain": t["domain"]}

    # 我的标签:收口 + 素材校验 + 强弱;按 id 去重(合并 materials)
    my_map = {}
    for item in raw.get("my_tags", []):
        tid = T.normalize(item.get("label", ""))
        if not tid:
            continue
        strength = item.get("strength") if item.get("strength") in ("强", "弱") else "强"
        refs = []
        for r in item.get("materials", []):
            rtype, rid = r.get("type"), r.get("id")
            if rtype == "internship" and rid in valid_intern_ids:
                refs.append({"type": "internship", "id": rid})
            elif rtype == "project" and rid in valid_project_ids:
                refs.append({"type": "project", "id": rid})
        if tid not in my_map:
            my_map[tid] = {**_meta(tid), "strength": strength, "materials": refs}
        else:
            # 合并素材引用,强弱取强
            seen = {(x["type"], x["id"]) for x in my_map[tid]["materials"]}
            my_map[tid]["materials"] += [r for r in refs if (r["type"], r["id"]) not in seen]
            if strength == "强":
                my_map[tid]["strength"] = "强"

    # JD 标签:收口 + 优先级 + 命中状态
    jd_tags = []
    seen_jd = set()
    uncatalogued = list(raw.get("uncatalogued", []) or [])
    for item in raw.get("jd_tags", []):
        tid = T.normalize(item.get("label", ""))
        if not tid:
            lbl = item.get("label", "")
            if lbl and lbl not in uncatalogued:
                uncatalogued.append(lbl)
            continue
        if tid in seen_jd:
            continue
        seen_jd.add(tid)
        priority = item.get("priority") if item.get("priority") in _PRIORITY_FACTOR else "重要"
        mine = my_map.get(tid)
        if not mine:
            status = "缺口"
        elif mine["strength"] == "弱":
            status = "部分"
        else:
            status = "命中"
        jd_tags.append({**_meta(tid), "priority": priority, "status": status})

    # 加权匹配分:命中=满分,部分=半分,缺口=0;权重=域权重×优先级系数
    total_w = matched_w = 0.0
    for t in jd_tags:
        w = T.tag_weight(t["id"]) * _PRIORITY_FACTOR[t["priority"]]
        total_w += w
        if t["status"] == "命中":
            matched_w += w
        elif t["status"] == "部分":
            matched_w += w * 0.5
    score = round(matched_w / total_w * 100) if total_w else 0

    my_tags = list(my_map.values())
    jd_ids = {t["id"] for t in jd_tags}
    for mt in my_tags:
        mt["in_jd"] = mt["id"] in jd_ids
    gaps = [t for t in jd_tags if t["status"] == "缺口"]

    return {
        "jd_tags": jd_tags,
        "my_tags": my_tags,
        "gaps": gaps,
        "score": score,
        "uncatalogued": uncatalogued[:8],
        "empty": False,
    }


# ===== POST /api/v1/ai/jd/parse — JD解析 =====
class JDParseRequest(BaseModel):
    jd_text: str
    company: str


@router.post("/jd/parse")
async def parse_jd(req: JDParseRequest):
    """解析JD，返回关键词、档位、匹配度等结构化信息"""
    import json
    import re
    from openai import OpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    prompt = f"""请从以下 JD 中提取关键信息，仅返回 JSON，不要任何其他文字。

公司：{req.company}
JD：
```
{req.jd_text[:2500]}
```

返回格式：
{{
  "position": "岗位名称",
  "tier": "冲刺/匹配/保底",
  "hard_skills": ["硬技能1","硬技能2"],
  "soft_skills": ["软技能1"],
  "core_requirements": ["核心要求1","核心要求2"],
  "bonus_points": ["加分项1"],
  "match_score": 75,
  "match_reason": "与候选人的匹配分析"
}}"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content

    # 提取 JSON
    match = re.search(r'\{.*\}', result_text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise HTTPException(status_code=500, detail="AI 返回格式异常，请重试")


# ===== POST /api/v1/ai/jd-analysis — 简历与JD匹配分析 =====
class JDAnalysisRequest(BaseModel):
    resume_text: str
    jd_text: str
    company: str = ""
    position: str = ""


@router.post("/jd-analysis")
async def jd_analysis(req: JDAnalysisRequest):
    """
    对比简历和JD，返回结构化匹配分析：
    - 总体匹配分（0-100）
    - 各维度匹配情况（strong/weak/missing）
    - 必须补充的内容
    - 可重点突出的内容
    """
    import json
    import re
    from openai import OpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    prompt = f"""你是一位资深产品经理招聘专家。请分析以下简历与JD的匹配程度，返回结构化JSON分析报告。

目标公司：{req.company or "未知"}
目标岗位：{req.position or "产品经理"}

【简历内容】
{req.resume_text[:2000]}

【岗位JD】
{req.jd_text[:2000]}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "overall_score": 72,
  "summary": "一句话总结匹配情况，如：候选人有2段B端实习，产品设计能力匹配，但缺乏数据分析经验",
  "match_items": [
    {{
      "aspect": "产品设计能力",
      "jd_requirement": "能独立完成需求分析和PRD输出",
      "resume_status": "strong",
      "suggestion": ""
    }},
    {{
      "aspect": "数据分析能力",
      "jd_requirement": "熟悉SQL，能独立取数分析",
      "resume_status": "weak",
      "suggestion": "建议在简历中补充SQL使用经验，或数据分析相关项目成果"
    }},
    {{
      "aspect": "行业经验",
      "jd_requirement": "有电商或SaaS行业经验优先",
      "resume_status": "missing",
      "suggestion": "简历中未体现相关行业经验，建议在项目描述中强调业务场景"
    }}
  ],
  "must_add": ["补充SQL数据分析能力的具体项目", "量化实习期间的产品成果数据"],
  "highlight": ["B端权限管理项目与JD高度匹配", "有完整的PRD输出经验"]
}}

match_items中每个维度的resume_status只能是：strong（已匹配）、weak（较弱）、missing（缺失）
overall_score范围0-100
must_add最多5条，highlight最多5条"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content

    # 提取JSON
    match_json = re.search(r'\{.*\}', result_text, re.DOTALL)
    if match_json:
        try:
            data = json.loads(match_json.group())
            return {
                "overall_score": data.get("overall_score", 0),
                "summary": data.get("summary", ""),
                "match_items": data.get("match_items", []),
                "must_add": data.get("must_add", []),
                "highlight": data.get("highlight", []),
            }
        except json.JSONDecodeError:
            pass

    # 降级：返回原始文本
    return {
        "overall_score": 0,
        "summary": "",
        "match_items": [],
        "must_add": [],
        "highlight": [],
        "raw": result_text,
    }


# ===== POST /api/v1/ai/interviewer-analysis — 面试官视角分析 =====
class InterviewerAnalysisRequest(BaseModel):
    resume_text: str       # 改写后的简历文本
    jd_text: str = ""      # JD文本（可选，有JD分析更精准）
    company: str = ""
    position: str = ""


@router.post("/interviewer-analysis")
async def interviewer_analysis(req: InterviewerAnalysisRequest):
    """
    扮演面试官视角分析简历：
    - JD能力命中率（strong/weak/missing）
    - 每个bullet的追问预警
    - 强信号词 vs 空话弱信号词
    """
    import json
    import re
    from openai import OpenAI

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    jd_section = f"\n\n【目标岗位 JD】\n{req.jd_text[:2000]}" if req.jd_text.strip() else ""
    company_info = f"{req.company} · {req.position}" if req.company else req.position or "产品经理"

    prompt = f"""你是一位{company_info}岗位的资深面试官。请从面试官视角严格审视以下简历，找出薄弱点和追问点。

【简历内容（已经过AI改写）】
{req.resume_text[:2500]}{jd_section}

请返回以下JSON格式（仅返回JSON，不要其他文字）：
{{
  "overall_score": 68,
  "summary": "一句话总结：简历表达清晰，但数据量化不足，B端经验深度有限",
  "match_items": [
    {{
      "aspect": "需求分析与PRD",
      "jd_requirement": "能独立完成需求分析和PRD输出",
      "resume_status": "strong",
      "suggestion": ""
    }},
    {{
      "aspect": "数据分析能力",
      "jd_requirement": "熟悉SQL，能独立取数分析",
      "resume_status": "weak",
      "suggestion": "简历中提到SQL但没有具体案例，建议补充'用SQL分析了XX数据，发现了XX问题'的具体描述"
    }},
    {{
      "aspect": "跨团队协作",
      "jd_requirement": "有与研发/设计/运营协作经验",
      "resume_status": "missing",
      "suggestion": "简历中未体现跨团队协作场景，建议在实习经历中加入与研发对接的具体案例"
    }}
  ],
  "follow_up_questions": [
    {{
      "bullet": "推动3个迭代上线",
      "question": "这3个迭代分别解决了什么问题？你是如何推动研发按时交付的？",
      "can_answer": false
    }},
    {{
      "bullet": "用户满意度提升20%",
      "question": "这个20%是怎么衡量的？用了什么指标？调研样本多大？",
      "can_answer": false
    }}
  ],
  "weak_signals": ["有效推动", "积极参与", "深入分析", "显著提升"],
  "strong_signals": ["NPS提升15分", "日活从800增至1200", "PRD覆盖23个用户故事"]
}}

重要规则：
- overall_score范围0-100，要严格，不要给虚高分
- match_items只分析JD中明确要求的3-5个核心能力（无JD则分析产品经理通用能力）
- follow_up_questions选取最容易被追问的2-3个bullet point
- weak_signals是"有效"、"积极"等虚词或无量化的描述
- strong_signals是有具体数字或具体场景的描述"""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[{"role": "user", "content": prompt}],
    )
    result_text = response.choices[0].message.content

    # 提取JSON
    match_json = re.search(r'\{.*\}', result_text, re.DOTALL)
    if match_json:
        try:
            data = json.loads(match_json.group())
            return {
                "overall_score":       data.get("overall_score", 0),
                "summary":             data.get("summary", ""),
                "match_items":         data.get("match_items", []),
                "follow_up_questions": data.get("follow_up_questions", []),
                "weak_signals":        data.get("weak_signals", []),
                "strong_signals":      data.get("strong_signals", []),
            }
        except json.JSONDecodeError:
            pass

    # 降级：返回原始文本
    return {
        "overall_score": 0,
        "summary": "",
        "match_items": [],
        "follow_up_questions": [],
        "weak_signals": [],
        "strong_signals": [],
        "raw": result_text,
    }


# ===== POST /api/v1/ai/generate-questions — 根据JD生成专项面试题 =====
class GenerateQuestionsRequest(BaseModel):
    jd_text: str
    company: str = ""
    position: str = ""
    application_id: int


@router.post("/generate-questions")
async def generate_interview_questions(req: GenerateQuestionsRequest):
    """
    根据 JD 文本，用 AI 生成 6-8 道针对该岗位的专项面试题，
    并自动存入 personal_questions 表（绑定 application_id）
    """
    from openai import OpenAI
    from core.database import get_db

    api_key, base_url, model = _get_llm_cfg()
    if not api_key:
        raise HTTPException(status_code=400, detail="未配置 API Key，请先到设置页填写")

    company_str = req.company or "目标公司"
    position_str = req.position or "产品经理"

    prompt = f"""你是{company_str}的资深产品经理面试官。

根据以下岗位JD，生成6-8道有针对性的面试题。

要求：
- 题目必须结合JD的具体要求，不要泛泛的通用PM题
- 覆盖产品设计、数据分析、业务理解、逻辑思维等维度
- 每道题独占一行，不加序号或符号前缀
- 题目语言简洁，直接描述问题场景

【{position_str} 岗位JD】
{req.jd_text[:3000]}

直接输出题目列表，每行一道题："""

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.choices[0].message.content.strip()
    questions = [
        line.strip().lstrip("0123456789.-、） ").strip()
        for line in raw.split("\n")
        if line.strip() and len(line.strip()) > 8
    ][:8]

    # 存入 personal_questions，绑定 application_id
    with get_db() as db:
        # 先删除该 application 下旧的 AI 生成题（source_round = "AI生成"）
        db.execute(
            "DELETE FROM personal_questions WHERE application_id = ? AND source_round = 'AI生成'",
            (req.application_id,),
        )
        for q in questions:
            db.execute(
                """INSERT INTO personal_questions
                   (question, source_company, source_position, source_round, application_id)
                   VALUES (?, ?, ?, 'AI生成', ?)""",
                (q, req.company, req.position, req.application_id),
            )

    return {"questions": questions, "count": len(questions)}
