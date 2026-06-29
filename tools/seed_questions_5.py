"""题库扩充 · 第五批:基于真实大厂面经,补充高频但此前遗漏的题。
分类用合并后的 6 大类(产品/AI产品/数据与增长/运营/行为面试/案例分析)。
跟随 backend/.env 的 DATABASE_URL。按题干去重,可重复运行。
"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from core.database import get_db  # noqa: E402

QUESTIONS = [
    {
        "category": "产品", "difficulty": "中等",
        "question": "产品经理的需求一般有哪些来源？如何处理不同来源的需求？",
        "companies": ["阿里", "腾讯", "字节"],
        "answer_framework": "1.四大来源 → 2.统一收口 → 3.价值评估 → 4.老板需求的处理 → 5.闭环反馈",
        "sample_answer": "需求主要四个来源:\n1) 产品自身(数据分析/用户调研/竞品分析验证出的需求);\n2) 业务/运营等部门提的需求;\n3) 老板/高层的需求;\n4) Bug修复和体验优化。\n处理:所有需求统一收口到需求池,用同一套标准(价值×成本)评估优先级,而非谁提的就先做。对老板需求也要理解背后真实目标、用数据辅助判断,而非盲从。最后给需求方反馈进展,形成闭环。核心是'让需求池有序、用标准而非关系决定优先级'。",
        "key_points": ["四大来源", "统一收口需求池", "同一套优先级标准", "理解老板需求背后目标", "反馈闭环"],
        "common_mistakes": ["谁提的先做谁的", "盲从老板需求", "需求无收口管理混乱"],
        "tags": ["产品", "需求来源", "需求管理"], "source": "大厂面经整理",
    },
    {
        "category": "产品", "difficulty": "中等",
        "question": "你和设计师或开发对一个需求有分歧、对方不认可，你会怎么处理？",
        "companies": ["腾讯", "字节", "美团"],
        "answer_framework": "1.先理解对方立场 → 2.摆数据 → 3.讲道理(对齐目标) → 4.必要时向上沟通 → 5.对事不对人",
        "sample_answer": "跨职能协作分歧很常见,处理三步走:\n1) 先倾听理解对方的顾虑(开发关心成本/技术风险、设计关心体验),很多分歧源于信息不对称;\n2) 摆数据:用数据/用户反馈证明做这个需求的必要性和收益;\n3) 讲道理:说明需求和公司战略/目标的一致性,回到共同目标;\n4) 基础沟通仍无法达成,可把双方leader拉到一起对齐(不是告状,是借助决策);\n5) 全程对事不对人。核心:用事实和共同目标说服,而非靠职级压人或硬刚。",
        "key_points": ["先理解对方立场", "摆数据", "对齐共同目标", "必要时向上对齐", "对事不对人"],
        "common_mistakes": ["靠职级压人", "情绪化硬刚", "不理解对方顾虑就争辩"],
        "tags": ["产品", "跨职能协作", "冲突处理"], "source": "大厂面经整理",
    },
    {
        "category": "产品", "difficulty": "简单",
        "question": "你认为产品经理的核心工作职责是什么？",
        "companies": ["阿里", "百度", "网易"],
        "answer_framework": "1.三阶段概括 → 2.产品规划 → 3.产品设计 → 4.产品落地 → 5.本质是对产品成功负责",
        "sample_answer": "产品经理的工作可概括为三个阶段:\n1) 产品规划:通过用户调研、数据分析、竞品分析做需求分析,定方向和优先级;\n2) 产品设计:输出产品脑图、流程图、原型、PRD;\n3) 产品落地:需求评审、排期、项目跟进、上线走查。\n但这些是动作,本质是'对产品的成功负责'——发现真问题、定义对的方案、推动落地、用数据验证迭代。一句话:产品经理是连接用户、业务和技术,让产品创造价值的人。",
        "key_points": ["规划-设计-落地三阶段", "需求分析", "PRD与原型", "推动落地", "对产品成功负责"],
        "common_mistakes": ["只说画原型写文档", "把PM等同于需求翻译", "不提对结果负责"],
        "tags": ["产品", "工作职责", "角色认知"], "source": "大厂面经整理",
    },
    {
        "category": "产品", "difficulty": "困难",
        "question": "针对我们公司的某款产品，你认为有哪些可以优化的地方？(大厂高频开放题)",
        "companies": ["百度", "腾讯", "字节"],
        "answer_framework": "1.表明已体验 → 2.明确用户与场景 → 3.发现真问题 → 4.给具体方案+预期收益 → 5.谦逊表达",
        "sample_answer": "这题考察你是否真用过产品、有没有产品sense,套路化吐槽会扣分:\n1) 先表明你认真体验过(体现诚意和准备);\n2) 锚定一个具体用户群和使用场景,别泛泛而谈;\n3) 指出该场景下一个真实的体验问题(最好有数据/亲身感受支撑);\n4) 给出具体的优化方案,并说明预期带来的价值;\n5) 谦逊收尾(可能我对内部数据了解有限,这是基于用户视角的观察)。核心:展示'发现真问题→给可落地方案→评估价值'的完整产品思维,而非挑刺。",
        "key_points": ["真实体验过", "锚定用户与场景", "发现真问题", "具体方案+预期收益", "谦逊表达"],
        "common_mistakes": ["套路化吐槽", "泛泛而谈不锚定场景", "只挑刺不给方案"],
        "tags": ["产品", "产品优化", "开放题"], "source": "大厂面经整理",
    },
    {
        "category": "产品", "difficulty": "困难",
        "question": "如果让你从0设计一款全新产品，你会从哪些方面入手？",
        "companies": ["字节", "腾讯", "拼多多"],
        "answer_framework": "1.用户与需求 → 2.市场与竞品 → 3.核心价值与MVP → 4.商业模式 → 5.增长与迭代",
        "sample_answer": "从0做产品,我会按这个框架:\n1) 用户与需求:目标用户是谁、真实痛点是什么、需求够不够痛够不够大;\n2) 市场与竞品:市场规模、有没有同类、我的差异化切入点;\n3) 核心价值与MVP:确定核心价值主张,用MVP最小化验证假设,别一上来做全;\n4) 商业模式:怎么持续赚钱/创造价值;\n5) 增长与迭代:冷启动获客路径、用数据驱动迭代。核心逻辑是'先验证有没有真需求和PMF,再谈规模化',避免自嗨做一个没人要的产品。",
        "key_points": ["用户与真需求", "市场竞品差异化", "核心价值+MVP验证", "商业模式", "PMF优先于规模化"],
        "common_mistakes": ["上来就想做大做全", "不验证需求自嗨", "忽视商业模式"],
        "tags": ["产品", "从0到1", "产品设计"], "source": "大厂面经整理",
    },
    {
        "category": "AI产品", "difficulty": "中等",
        "question": "AI产品经理和传统产品经理的核心区别是什么？",
        "companies": ["字节", "百度", "微软"],
        "answer_framework": "1.功能设计师vs能力设计师 → 2.确定性vs概率性 → 3.技术理解要求 → 4.数据驱动 → 5.伦理风险意识",
        "sample_answer": "一句话:传统PM是'功能设计师',AI PM是'能力设计师'。\n1) 传统PM设计确定的功能流程,AI PM要设计和驾驭概率性的'能力'(模型输出不确定);\n2) AI PM必须能与算法工程师对话,理解模型的边界和局限;\n3) 更强的数据驱动思维:用数据持续优化模型效果;\n4) 要管理'不确定性':设计兜底、处理幻觉、定义能力边界;\n5) 新增伦理与风险意识:预判和处理AI带来的偏见、安全等风险。本质区别在于:从'设计确定的功能'转向'驾驭不确定的智能'。",
        "key_points": ["功能设计师vs能力设计师", "确定性vs概率性", "懂技术边界", "数据驱动优化", "伦理风险意识"],
        "common_mistakes": ["只说AI PM要懂技术", "忽视概率性带来的设计差异", "不提风险意识"],
        "tags": ["AI产品", "AIPMvs传统PM", "角色认知"], "source": "大厂面经整理",
    },
    {
        "category": "行为面试", "difficulty": "简单",
        "question": "你的优势是什么？为什么你适合这个岗位？",
        "companies": ["通用"],
        "answer_framework": "1.提炼2-3个核心优势 → 2.每个配证据 → 3.对齐岗位要求 → 4.差异化 → 5.自信不浮夸",
        "sample_answer": "这题是推销自己,关键是'有证据、对岗位':\n1) 提炼2-3个核心优势(别贪多),比如数据驱动、跨部门推动力、用户洞察;\n2) 每个优势配一个具体例子/成果证明(空说没用);\n3) 把优势对齐到这个岗位的核心要求上,说明为什么匹配;\n4) 如果有,点出你的差异化(别人少有的组合,如懂技术的产品/有行业背景);\n5) 自信但不浮夸,用事实说话。核心:让面试官清晰看到'你的能力正好是这个岗位需要的'。",
        "key_points": ["提炼2-3个优势", "每个配证据", "对齐岗位要求", "差异化", "自信不浮夸"],
        "common_mistakes": ["罗列一堆优势无重点", "空说没例子", "与岗位无关"],
        "tags": ["行为面试", "个人优势", "岗位匹配"], "source": "大厂面经整理",
    },
]


def main():
    added = skipped = 0
    with get_db() as db:
        for q in QUESTIONS:
            if db.execute("SELECT id FROM interview_questions WHERE question = ?", (q["question"],)).fetchone():
                skipped += 1
                continue
            db.execute(
                """INSERT INTO interview_questions
                   (category, question, difficulty, companies, answer_framework,
                    sample_answer, key_points, common_mistakes, tags, source)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    q["category"], q["question"], q.get("difficulty", "中等"),
                    json.dumps(q.get("companies", []), ensure_ascii=False),
                    q.get("answer_framework", ""), q.get("sample_answer", ""),
                    json.dumps(q.get("key_points", []), ensure_ascii=False),
                    json.dumps(q.get("common_mistakes", []), ensure_ascii=False),
                    json.dumps(q.get("tags", []), ensure_ascii=False),
                    q.get("source", "大厂面经整理"),
                ),
            )
            added += 1
    print(f"[seed5] added {added}, skipped {skipped}, batch size {len(QUESTIONS)}")


if __name__ == "__main__":
    main()
