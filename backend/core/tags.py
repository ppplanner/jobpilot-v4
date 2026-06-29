"""产品经理受控标签词表 —— 全项目唯一真源(single source of truth)。

设计原则(谨慎,防漂移):
  1. 五域强制分离:方向(角色) / 方法(手段) / 行业(领域) / 工具 / 软素质。
     刻意拆开易混淆的对:增长产品(方向) vs 增长方法(手段)、
     企业服务(行业) vs B端产品(方向)、数据产品(方向) vs 数据分析(方法)。
  2. 别名收口:LLM 只能映射到下列标准标签,识别到别名折叠为标准词,禁止自由发明。
  3. 证据分级:方向/方法/行业需素材支撑;软素质默认不打,仅 JD 明确要求且有事例时计入。
  4. 受控生长:无法归类的新词进 uncatalogued 候选区,人工评审后才扩表,不自动膨胀。

匹配权重:方向/方法 ×1.0 → 行业 ×0.6 → 工具 ×0.3 → 软素质 ×0.2
"""
from typing import Optional

# 域定义:id -> (中文名, 匹配权重)
DOMAINS = {
    "direction": ("产品方向", 1.0),
    "method":    ("核心方法能力", 1.0),
    "domain":    ("业务行业领域", 0.6),
    "tooling":   ("技术工具素养", 0.3),
    "soft":      ("通用软素质", 0.2),
}

# 标签本体:每个 {id, label, domain, aliases}
# id 为稳定 ascii slug(写入数据库/关联素材用),label 为展示用标准中文标签。
TAGS = [
    # ── 域1 · 产品方向(角色定位,一人通常 1-2 个) ──
    {"id": "dir-b",          "label": "B端产品",   "domain": "direction",
     "aliases": ["ToB", "企业服务产品", "后台产品", "中台", "中台产品", "SaaS产品", "B端"]},
    {"id": "dir-c",          "label": "C端产品",   "domain": "direction",
     "aliases": ["ToC", "消费级产品", "用户端产品", "C端"]},
    {"id": "dir-platform",   "label": "平台产品",   "domain": "direction",
     "aliases": ["开放平台", "双边市场", "交易平台", "生态产品", "平台型产品"]},
    {"id": "dir-growth",     "label": "增长产品",   "domain": "direction",
     "aliases": ["用户增长", "Growth", "增长PM", "增长方向"]},
    {"id": "dir-data",       "label": "数据产品",   "domain": "direction",
     "aliases": ["数据平台产品", "BI产品", "指标产品", "数据中台产品"]},
    {"id": "dir-strategy",   "label": "策略产品",   "domain": "direction",
     "aliases": ["算法产品", "推荐产品", "搜索产品", "风控产品", "策略PM"]},
    {"id": "dir-ai",         "label": "AI产品",     "domain": "direction",
     "aliases": ["大模型产品", "AIGC产品", "智能产品", "AI PM", "LLM产品"]},
    {"id": "dir-monetize",   "label": "商业化产品", "domain": "direction",
     "aliases": ["变现产品", "广告产品", "会员体系", "支付产品", "商业化PM"]},

    # ── 域2 · 核心方法能力(匹配主信号,需素材证明) ──
    {"id": "m-requirement",  "label": "需求分析",   "domain": "method",
     "aliases": ["需求挖掘", "需求梳理", "需求管理", "优先级排序", "需求评审"]},
    {"id": "m-competitive",  "label": "竞品分析",   "domain": "method",
     "aliases": ["竞争分析", "竞品调研", "市场竞品"]},
    {"id": "m-userresearch", "label": "用户研究",   "domain": "method",
     "aliases": ["用研", "用户调研", "用户访谈", "用户画像", "可用性测试", "问卷调研"]},
    {"id": "m-data",         "label": "数据分析",   "domain": "method",
     "aliases": ["数据驱动", "数据敏感度", "指标分析", "数据解读", "归因分析"]},
    {"id": "m-experiment",   "label": "实验设计",   "domain": "method",
     "aliases": ["AB测试", "A/B测试", "灰度发布", "对照实验", "AB实验"]},
    {"id": "m-design",       "label": "产品设计",   "domain": "method",
     "aliases": ["交互设计", "流程设计", "原型设计", "方案设计", "信息架构"]},
    {"id": "m-prd",          "label": "文档撰写",   "domain": "method",
     "aliases": ["PRD", "需求文档", "产品方案撰写", "文档能力", "PRD输出"]},
    {"id": "m-business",     "label": "商业分析",   "domain": "method",
     "aliases": ["商业模式", "商业敏感度", "市场分析", "ROI测算", "盈利模型"]},
    {"id": "m-project",      "label": "项目管理",   "domain": "method",
     "aliases": ["项目推进", "排期管理", "推动落地", "进度管理", "风险管理"]},
    {"id": "m-mechanism",    "label": "机制设计",   "domain": "method",
     "aliases": ["规则设计", "策略设计", "激励机制", "机制策略"]},
    {"id": "m-growth",       "label": "增长方法",   "domain": "method",
     "aliases": ["转化优化", "漏斗分析", "裂变", "渠道投放", "拉新留存", "AARRR"]},
    {"id": "m-operations",   "label": "运营能力",   "domain": "method",
     "aliases": ["用户运营", "活动运营", "内容运营", "社群运营", "私域", "运营"]},

    # ── 域3 · 业务/行业领域(领域知识) ──
    {"id": "ind-ecommerce",  "label": "电商",       "domain": "domain",
     "aliases": ["零售", "电商交易", "跨境电商", "电商行业"]},
    {"id": "ind-social",     "label": "社交内容",   "domain": "domain",
     "aliases": ["社区", "内容平台", "UGC", "短视频", "社交", "内容社区"]},
    {"id": "ind-enterprise", "label": "企业服务",   "domain": "domain",
     "aliases": ["SaaS行业", "ToB行业", "企业软件", "企服"]},
    {"id": "ind-fintech",    "label": "金融科技",   "domain": "domain",
     "aliases": ["金融", "支付行业", "信贷", "风控行业", "Fintech"]},
    {"id": "ind-edu",        "label": "教育",       "domain": "domain",
     "aliases": ["在线教育", "教育科技", "教育行业"]},
    {"id": "ind-locallife",  "label": "本地生活",   "domain": "domain",
     "aliases": ["O2O", "到店", "外卖", "出行", "本地服务"]},
    {"id": "ind-game",       "label": "游戏",       "domain": "domain",
     "aliases": ["游戏行业", "手游"]},
    {"id": "ind-tool",       "label": "工具效率",   "domain": "domain",
     "aliases": ["效率工具", "协同办公", "生产力工具"]},

    # ── 域4 · 技术/工具素养(加分项,二元有/无) ──
    {"id": "t-sql",          "label": "SQL",        "domain": "tooling",
     "aliases": ["数据查询", "写SQL", "SQL取数"]},
    {"id": "t-prototype",    "label": "原型工具",   "domain": "tooling",
     "aliases": ["Axure", "Figma", "墨刀", "Sketch"]},
    {"id": "t-bi",           "label": "数据BI工具", "domain": "tooling",
     "aliases": ["Tableau", "PowerBI", "GA", "神策", "BI工具"]},
    {"id": "t-tech",         "label": "技术理解",   "domain": "tooling",
     "aliases": ["懂技术", "API", "数据库", "前后端基础", "技术方案评估"]},
    {"id": "t-ai",           "label": "AI工具应用", "domain": "tooling",
     "aliases": ["Prompt工程", "大模型API", "AIGC工具", "提示词"]},

    # ── 域5 · 通用软素质(claim-prone,默认不打) ──
    {"id": "s-zerotoone",    "label": "0到1经验",   "domain": "soft",
     "aliases": ["从0到1", "冷启动", "新产品搭建", "0-1"]},
    {"id": "s-collab",       "label": "跨团队协作", "domain": "soft",
     "aliases": ["跨部门协作", "协调沟通", "跨团队"]},
    {"id": "s-leadership",   "label": "团队管理",   "domain": "soft",
     "aliases": ["带团队", "管理经验", "Leadership", "团队Leader"]},
]

# ── 派生索引 ──
_BY_ID = {t["id"]: t for t in TAGS}
_LABEL_TO_ID = {t["label"]: t["id"] for t in TAGS}
# 别名/标签 -> id(全部转小写、去空白以容忍大小写和空格差异)
_LOOKUP = {}
for _t in TAGS:
    _LOOKUP[_t["label"].lower().replace(" ", "")] = _t["id"]
    for _a in _t["aliases"]:
        _LOOKUP[_a.lower().replace(" ", "")] = _t["id"]


def get_tag(tag_id: str) -> Optional[dict]:
    """按 id 取标签完整信息。"""
    return _BY_ID.get(tag_id)


def tag_weight(tag_id: str) -> float:
    """取某标签的匹配权重(按所属域)。未知标签返回 0。"""
    t = _BY_ID.get(tag_id)
    if not t:
        return 0.0
    return DOMAINS.get(t["domain"], ("", 0.0))[1]


def normalize(text: str) -> Optional[str]:
    """把任意标签文本(标准标签或别名)收口为标准标签 id;无法识别返回 None。
    后端安全网:即便 LLM 漏映射,这里再兜一层。"""
    if not text:
        return None
    key = text.strip().lower().replace(" ", "")
    return _LOOKUP.get(key)


def normalize_to_label(text: str) -> Optional[str]:
    """收口为标准中文标签;无法识别返回 None。"""
    tid = normalize(text)
    return _BY_ID[tid]["label"] if tid else None


def build_tag_catalog_block() -> str:
    """生成给 LLM 的受控标签清单 + 映射指令,注入 prompt 用。
    只列标准标签(别名收口由后端 normalize 兜底),保持 prompt 精简。"""
    lines = [
        "【受控标签词表】只能从下列标准标签中选择;遇到含义相同的说法,归并到最接近的标准标签;",
        "无法归类的词不要编造,放进 uncatalogued 字段单独返回。",
    ]
    for dom_id, (dom_label, _w) in DOMAINS.items():
        labels = [t["label"] for t in TAGS if t["domain"] == dom_id]
        lines.append(f"- {dom_label}：{' | '.join(labels)}")
    return "\n".join(lines)


def all_tags_public() -> list:
    """返回给前端/接口的精简标签列表(id+label+domain+weight),供 UI 展示与分组。"""
    return [
        {"id": t["id"], "label": t["label"], "domain": t["domain"],
         "weight": DOMAINS[t["domain"]][1]}
        for t in TAGS
    ]
