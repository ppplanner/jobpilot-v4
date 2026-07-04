"use client"

import { useState, useEffect } from "react"
import { api, PersonalQuestion } from "@/lib/api"
import { SHEET_GRID } from "@/components/blueprint"

const API = ""

interface Question {
  id: string
  category: string
  question: string
  difficulty: string
  companies: string[]
  answer_framework: string
  sample_answer: string
  key_points: string[]
  common_mistakes: string[]
  tags: string[]
  question_type?: QuestionType
  scenario_context?: string
  data_snapshot?: string
}

interface Stats {
  total_practiced: number
  correct_count: number
  accuracy: number
  recent_7days: number
}

type QuestionType = "classic" | "scenario" | "data" | "pressure"

interface QuestionTypeConfig {
  key: QuestionType
  label: string
  emoji: string
  desc: string
  color: string
  bgColor: string
  borderColor: string
}

const QUESTION_TYPES: QuestionTypeConfig[] = [
  { key: "classic",  label: "常规题",   emoji: "📚", desc: "B端PM通用能力考察",         color: "text-[#2E5B54]", bgColor: "bg-[#E4EBE2]", borderColor: "border-[#CBD8C4]" },
  { key: "scenario", label: "行业情景题", emoji: "🏭", desc: "给定行业背景，真实场景解题", color: "text-[#436069]", bgColor: "bg-[#E2EBEC]", borderColor: "border-[#C4D2D4]" },
  { key: "data",     label: "数据诊断题", emoji: "📊", desc: "数据异常分析，拆解指标下降", color: "text-[#876426]", bgColor: "bg-[#F2E9D6]", borderColor: "border-[#E1D3AE]" },
  { key: "pressure", label: "压力反问题", emoji: "🔥", desc: "面试官刁难题，考察应变逻辑", color: "text-[#9E4631]", bgColor: "bg-[#F1E0DA]", borderColor: "border-[#E3C6BC]" },
]

const EXTRA_QUESTIONS: Question[] = [
  {
    id: "sc_001", category: "产品设计", question: "你是一家医疗SaaS公司的B端PM，某三甲医院反映「医生排班系统」在节假日班次调整时频繁出错，造成科室人员短缺。请分析根本原因并给出产品解决方案。",
    difficulty: "中等", companies: ["医疗SaaS公司"], question_type: "scenario",
    scenario_context: "🏥 行业背景：医疗SaaS，客户为三甲医院，排班系统已上线2年，日均500+医生使用。节假日排班出错率较平时上升300%。",
    answer_framework: "1.还原问题：节假日排班逻辑 vs 工作日排班逻辑差异 → 2.根因分析：规则引擎是否支持节假日例外逻辑？用户操作链路复杂度？ → 3.解决方案：节假日排班模板+智能预填充+冲突检测 → 4.验收指标：错误率下降80%以上",
    sample_answer: "**第一步：还原问题场景**\n医院排班在节假日有特殊规则：轮休倒班、急诊加强人手、跨科室调配。现有系统可能只支持「常规周期排班」，节假日需要手动大量修改，操作步骤繁琐导致出错率高。\n\n**第二步：根因假设（用数据验证）**\n- 规则层：系统是否支持「节假日排班模板」？\n- 操作层：节假日调整涉及几步操作？是否有冲突预警？\n- 数据层：出错集中在哪些操作（删除/新增/跨科室调配）？\n\n**第三步：解决方案**\n① 节假日排班模板：医院预设常见节假日排班规则，一键应用\n② 智能冲突检测：保存前自动检测科室人员是否低于最低配置\n③ 变更确认流程：重大调整需要二次确认+短信通知相关医生\n④ 操作日志回溯：出错可追溯是谁在什么时间改了什么\n\n**第四步：验收指标**\n节假日排班错误率下降≥80%，医生排班确认时间<5分钟",
    key_points: ["节假日例外逻辑", "冲突检测", "操作简化", "业务规则引擎"],
    common_mistakes: ["只优化界面不改底层规则引擎", "忽略跨科室调配场景", "没有考虑医生知情权（通知机制）"],
    tags: ["医疗", "SaaS", "排班", "情景题"],
  },
  {
    id: "sc_002", category: "产品设计", question: "你负责一家供应链SaaS公司的「仓储管理系统（WMS）」，某制造业大客户反映：旺季时系统并发处理能力下降，出库扫码响应慢达5秒以上，导致工人停工等待。请给出产品侧解决思路。",
    difficulty: "困难", companies: ["供应链SaaS"], question_type: "scenario",
    scenario_context: "🏭 行业背景：制造业仓储，旺季单日扫码出库操作量超10万次，工人使用PDA扫码，系统响应>5秒，正常应<1秒。",
    answer_framework: "1.性能瓶颈定位：前端/网络/后端/数据库 → 2.产品侧可做：操作本地化缓存/批量提交/离线模式 → 3.协同研发：接口优化/数据库索引 → 4.临时应急方案 → 5.长期架构优化",
    sample_answer: "**定位问题层次（产品经理视角）**\n\n性能问题不是PM直接解决的，但PM要主导问题定位并给出产品侧的缓解方案：\n\n**产品侧可立即做的：**\n① 本地缓存：PDA端建立本地操作队列，扫码先写本地缓存→批量同步服务器（用户感知响应<0.5s）\n② 离线模式：网络不稳时允许离线扫码，联网后自动同步\n③ 简化操作链路：减少每次扫码需要确认的字段数量\n\n**与研发协同做的：**\n① 识别热点接口，优先优化出库接口的数据库查询\n② 考虑读写分离和缓存层（Redis）\n\n**应急方案（旺季撑过去）：**\n临时扩容服务器，同时上报给运维在旺季前一周做压测\n\n**长期方案：**\n建立性能基准线，每季度旺季前压测，不达标不上线",
    key_points: ["本地缓存", "离线模式", "产品-研发协同", "性能基准"],
    common_mistakes: ["PM完全甩给研发", "只讲技术方案不讲产品侧方案", "没有应急兜底"],
    tags: ["供应链", "WMS", "性能", "情景题"],
  },
  {
    id: "sc_003", category: "商业分析", question: "你是一家金融科技公司的B端PM，公司的「企业记账SaaS」产品对中小微企业免费开放了1年，现在要推进商业化付费。月活企业数2000家，平均每家3个用户，续费意愿调研显示只有15%愿意付费。请制定商业化策略。",
    difficulty: "困难", companies: ["金融科技"], question_type: "scenario",
    scenario_context: "💰 行业背景：记账SaaS，免费1年，月活2000家企业，续费意愿15%，竞品同类产品定价399-999元/年。",
    answer_framework: "1.分析续费意愿低原因 → 2.用户分层：付费意愿强/弱 → 3.商业化方案：功能分级+价格阶梯 → 4.免费→付费迁移策略 → 5.预期收入估算",
    sample_answer: "**1. 分析续费意愿低的根因**\n先调研15%里：他们愿意付什么价格？用了哪些功能？再看85%不愿意的：是价格问题还是价值感知问题？\n\n**2. 用户分层**\n- A类（重度用户，约20%）：每月记账50+笔，用了报表功能 → 付费意愿强，目标转化\n- B类（轻度用户，约60%）：只用基础记账 → 需要激励或功能升级才会付费\n- C类（僵尸用户，约20%）：基本不活跃 → 放弃\n\n**3. 商业化方案（功能分级）**\n免费版：基础记账+手动录入（保留，获客用）\n专业版（299/年）：自动对账+财务报表+多账户+数据导出\n企业版（999/年）：以上+多用户协作+发票管理+API接口\n\n**4. 迁移策略**\n- 给A类用户3个月免费试用专业版（先让他们习惯高级功能）\n- 功能锁定：免费版数据导出每月限5次，报表只看3个月\n- 私域运营：企业主微信群，定期分享财税政策，建立信任\n\n**5. 预期收入**\n2000×20%×299 = 119,600元/年（保守估计），达到盈亏平衡后继续扩张",
    key_points: ["用户分层", "功能分级", "付费迁移策略", "收入估算"],
    common_mistakes: ["直接全员付费，不给过渡期", "免费功能给太少用户体验差", "没有收入预测"],
    tags: ["金融科技", "商业化", "SaaS", "情景题"],
  },
  {
    id: "data_001", category: "数据分析", question: "上周你们B端SaaS产品的DAU从8000骤降至5200（下降35%），但新增注册用户和销售端反馈均正常。请系统性地拆解原因并给出排查步骤。",
    difficulty: "中等", companies: ["阿里", "美团", "字节"], question_type: "data",
    data_snapshot: "📊 数据快照：\n• 周一至周四 DAU 正常约8000\n• 周五开始下滑：7200 → 6500 → 5200\n• 新增注册：正常\n• 付费转化：无明显变化\n• 客服工单：未见明显投诉高峰",
    answer_framework: "MECE拆解：1.是否是系统性问题（全部用户下降？还是某类用户？）→ 2.时间维度：哪天开始？当天发布了什么？→ 3.用户维度：新/老用户？哪个功能模块？→ 4.地域/渠道维度 → 5.数据统计口径是否变了",
    sample_answer: "**排查框架（DAU下降分析）**\n\n**第一步：确认数据真实性**\n- 数据口径是否变了？（统计方式改变可能导致数字下降）\n- 埋点是否在周五前后有修改？\n\n**第二步：时间维度定位**\n- 周五发生了什么？系统更新、营销活动结束、外部事件？\n- 对比上上周同期：是否有周期性规律（B端周末本来就低）？\n\n**第三步：用户维度拆解**\n- 新用户 vs 老用户：哪类用户流失？\n- 企业规模：大客户 vs 小客户？\n- 功能维度：哪个核心功能的使用量下降？\n\n**第四步：假设验证**\n- 假设A：周末B端用户自然下线 → 对比上周五同期\n- 假设B：某个核心功能报错 → 查错误日志\n- 假设C：某个渠道来源用户流失 → 分渠道看DAU\n\n**第五步：结论输出**\n每次分析要给出：「XX用户在YY场景下因ZZ原因活跃度下降，影响了约WW的DAU」\n\n**面试加分**：主动提出下一步数据看板建设，防止下次出现类似问题时排查慢",
    key_points: ["数据真实性验证", "时间维度归因", "用户分层", "MECE拆解"],
    common_mistakes: ["直接猜原因不拆解数据", "忘记验证统计口径", "没有量化影响范围"],
    tags: ["数据诊断", "DAU", "归因分析", "数据题"],
  },
  {
    id: "data_002", category: "数据分析", question: "你们SaaS产品上个月NPS（净推荐值）从+42骤降到+18，但客服工单量未见异常。请分析可能的原因并制定改进计划。",
    difficulty: "中等", companies: ["阿里", "钉钉", "飞书"], question_type: "data",
    data_snapshot: "📊 数据快照：\n• 上月NPS：+42（行业优秀水平）\n• 本月NPS：+18（下降24分）\n• 推荐者比例：52% → 38%\n• 被动者比例：34% → 42%\n• 贬损者比例：14% → 20%\n• 调研样本：上月280份，本月310份",
    answer_framework: "1.样本问题？→ 2.调研时机变了？→ 3.产品体验变化：新功能/UI改版/性能下降 → 4.客户成功问题：服务响应/实施质量 → 5.竞品影响：用户心理预期提升",
    sample_answer: "**NPS骤降分析框架**\n\n**首先质疑数据本身**\n- 调研样本是否有偏差？（本月多了新注册用户，他们评分往往更低）\n- 调研触发时机：是否从「使用30天后」改成了「注册后3天」？\n- 调研方式变了吗？（弹窗 vs 邮件 vs 电话）\n\n**分析被动者和贬损者的开放评论**\n提炼最高频的负面关键词：\n- 「速度慢」→ 性能问题\n- 「不好用」→ 某功能改版体验倒退\n- 「客服回复慢」→ 服务质量\n\n**时间轴对比**\n上月到本月之间发生了什么？\n- 是否有大版本更新？（UI重构最容易导致NPS下降）\n- 是否有营销活动引入大量低匹配客户？\n\n**改进计划**\n① 短期：联系NPS低分客户，1对1访谈，快速修复高频痛点\n② 中期：建立NPS监测体系，每周看趋势，分类型客户对比\n③ 长期：产品决策中加入NPS影响评估",
    key_points: ["NPS样本偏差", "开放评论分析", "时间轴归因", "客户分层"],
    common_mistakes: ["直接信数字不质疑样本", "只看分数不看评论", "没有分客户类型分析"],
    tags: ["NPS", "用户满意度", "数据诊断", "数据题"],
  },
  {
    id: "press_001", category: "行为面试", question: "面试官说：「你没有做过真正的B端产品，你之前的实习不过是做需求文档的工具人，根本不算真正的产品经理。你怎么回应？」",
    difficulty: "困难", companies: ["阿里", "腾讯", "字节", "美团"], question_type: "pressure",
    answer_framework: "压力面试回应三步法：1.承认局限（不防御）→ 2.重新定义价值（我做了什么、学到了什么）→ 3.展示成长路径（未来计划）",
    sample_answer: "我理解您的质疑，从客观角度确实，作为实习生我无法独立主导整个产品从0到1。\n\n但我想分享一下我认为「真正的产品思维」体现在哪里——\n\n在我实习期间，我负责的是商家中台权限管理模块的需求分析。一开始我也只是记录需求、写文档。但后来我发现商家运营角色和门店管理员之间的权限边界没有被清晰定义，如果按照销售给的需求直接做，上线后一定会有问题。\n\n我主动做了15个商家的用户访谈，发现核心痛点是「权限配置太复杂，门店店长不会用」，我重新梳理了需求，推动产品做了简化，上线后配置完成率从42%提升到81%。\n\n我承认我还有很多不足，比如还没有独立负责过完整的产品规划和商业化决策。但我对B端产品的理解方式、发现问题的能力，我认为是真实的。\n\n我想请教您：从您的视角，您认为应届PM最需要补强哪个方向？",
    key_points: ["不防御", "用具体案例反驳", "承认局限但不认输", "反问展示主动性"],
    common_mistakes: ["情绪化防御", "过度道歉软化", "没有用数据支撑", "没有反问"],
    tags: ["压力面试", "经验质疑", "反问", "压力题"],
  },
  {
    id: "press_002", category: "行为面试", question: "「我们这个岗位需要和技术深度协作，你不懂技术，怎么跟研发沟通？他们不会不配合你吗？」",
    difficulty: "简单", companies: ["阿里", "腾讯", "字节", "美团", "京东"], question_type: "pressure",
    answer_framework: "1.承认不是技术专家 → 2.展示「够用的技术理解」：懂基础概念、能读懂技术文档 → 3.沟通策略：尊重研发专业性+数据说话+提问而非命令 → 4.举例说明",
    sample_answer: "我确实不是技术背景出身，但我认为B端PM和研发高效协作不要求PM懂代码，而是需要：\n\n**第一：建立共同语言**\n我会主动去了解基础技术概念——RESTful API、数据库索引、前后端分离这些不需要我会写，但我要能听懂研发说的是什么意思，知道这个需求在技术层面的复杂度大概在哪里。\n\n**第二：尊重研发的专业判断**\n我不会说「这个应该3天能做完」，而是会问「这个需求的技术难点在哪里？有没有更好的实现方式？」——让研发感受到被尊重，他们反而更愿意协作。\n\n**第三：用数据说话**\n当有需求优先级分歧时，我会带着数据（用户反馈频次、业务影响范围）来谈，而不是靠职级压制。\n\n在我实习时，有一次研发说某个功能「技术上实现不了」，我没有坚持，而是问「能不能换个实现路径」，最后找到了折中方案。\n\n不懂代码不是弱点，懂得如何和技术协作才是PM的核心能力。",
    key_points: ["够用的技术理解", "尊重研发专业性", "数据说话", "提问而非命令"],
    common_mistakes: ["假装自己懂技术", "说「我会学技术」但没有具体计划", "没有举实际协作例子"],
    tags: ["技术协作", "压力面试", "研发关系", "压力题"],
  },
  {
    id: "press_003", category: "行为面试", question: "「B端产品经理和C端产品经理相比，你觉得哪个更难？为什么你选择做B端而不是C端？」（这是一道考察你认知深度的问题，没有标准答案，但有陷阱）",
    difficulty: "简单", companies: ["阿里", "腾讯", "字节", "美团"], question_type: "pressure",
    answer_framework: "不要说「B端更难/C端更难」的绝对判断 → 分析两者核心差异 → 结合自身经历说为什么选B端",
    sample_answer: "我不会说哪个「更难」——这是个陷阱，因为难度取决于产品阶段和个人能力匹配度。\n\n**两者的核心差异：**\nB端：决策链长（多个利益相关方）、需求复杂（流程多、角色多）、成功指标是效率/ROI提升、销售驱动\nC端：用户量大（需要敏锐的用户感知）、迭代快（A/B测试驱动）、成功指标是DAU/留存/转化\n\n**我选B端的原因：**\n我喜欢解决「有清晰业务逻辑的复杂问题」。B端产品的需求背后有非常具体的业务场景——比如一个审批流程的设计，背后是真实的企业组织结构和权责关系。这种「把复杂业务映射成好用的产品」的过程让我很有成就感。\n\n另外，B端PM需要深度理解行业，这让我觉得自己的积累是有复利的——在一个行业里做得越久，对业务的理解越深，越能做出好产品。\n\nC端的数据感知和快速迭代能力我也在学习，我认为两种思维方式互补才是最理想的PM能力模型。",
    key_points: ["避免绝对判断", "清晰阐述差异", "结合个人选择理由", "展示思辨能力"],
    common_mistakes: ["说B端更难，显得不了解C端", "只背书B端定义没有个人观点", "没有结合自身经历"],
    tags: ["B端vs C端", "职业选择", "认知深度", "压力题"],
  },
]

function QuestionCard({ q, onClick, typeConfig }: {
  q: Question; onClick: () => void; typeConfig: QuestionTypeConfig
}) {
  return (
    <div onClick={onClick}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--primary)]/50 hover:shadow-sm transition-all cursor-pointer group flex items-start gap-3">
      {/* 左侧类型色条 */}
      <div className={`shrink-0 w-1 self-stretch rounded-full mt-0.5 ${
        typeConfig.key === "classic"  ? "bg-blue-400" :
        typeConfig.key === "scenario" ? "bg-purple-400" :
        typeConfig.key === "data"     ? "bg-amber-400" : "bg-red-400"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{q.category}</span>
          {q.key_points.slice(0, 2).map(kp => (
            <span key={kp} className="text-[10px] px-1.5 py-0.5 bg-[var(--surface2)] text-[var(--text-muted)] rounded">
              {kp}
            </span>
          ))}
        </div>
        <p className="text-sm text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors leading-relaxed line-clamp-2">
          {q.question}
        </p>
      </div>
      <span className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] text-xs mt-1 transition-colors">→</span>
    </div>
  )
}

function QuestionDetail({ q, typeConfig, onClose }: {
  q: Question; typeConfig: QuestionTypeConfig; onClose: () => void
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [marked, setMarked] = useState<"correct" | "wrong" | null>(null)

  const submit = async (correct: boolean) => {
    setMarked(correct ? "correct" : "wrong")
    try {
      const numId = parseInt(q.id.replace(/\D/g, "")) || Math.floor(Math.random() * 9999)
      await fetch(`${API}/api/v1/practice/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: numId, is_correct: correct, time_spent: 0 }),
      })
    } catch { }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${typeConfig.bgColor} ${typeConfig.color} ${typeConfig.borderColor}`}>
              {typeConfig.emoji} {typeConfig.label}
            </span>
            <span className="text-xs px-2 py-0.5 bg-[var(--surface2)] text-[var(--text-sub)] rounded">{q.category}</span>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {q.scenario_context && (
            <div className={`rounded-xl p-4 border ${typeConfig.bgColor} ${typeConfig.borderColor}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${typeConfig.color}`}>背景设定</p>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${typeConfig.color}`}>{q.scenario_context}</p>
            </div>
          )}
          {q.data_snapshot && (
            <div className="rounded-xl p-4 border bg-amber-50 border-amber-200">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 text-amber-700">数据快照</p>
              <pre className="text-sm leading-relaxed text-amber-800 whitespace-pre-wrap font-mono">{q.data_snapshot}</pre>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">面试题目</p>
            <h2 className="text-base font-semibold text-[var(--text-main)] leading-relaxed">{q.question}</h2>
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-2">答题框架（先想好再看答案）</p>
            <p className="text-sm text-[var(--text-sub)] leading-relaxed">{q.answer_framework}</p>
          </div>

          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              查看参考答案
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">参考答案</p>
                <div className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">{q.sample_answer}</div>
              </div>

              {q.common_mistakes.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">常见误区（避坑）</p>
                  <ul className="space-y-1">
                    {q.common_mistakes.map((m, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="shrink-0 text-red-400 mt-0.5 font-bold">×</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!marked ? (
                <div>
                  <p className="text-xs text-[var(--text-muted)] text-center mb-3">对照参考答案，你掌握了吗？</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => submit(false)}
                      className="py-2.5 rounded-lg border-2 border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                      还需练习
                    </button>
                    <button onClick={() => submit(true)}
                      className="py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors">
                      已经掌握
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`py-3 px-4 rounded-lg text-center text-sm font-medium ${
                  marked === "correct" ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                }`}>
                  {marked === "correct" ? "已记录，继续保持！" : "已标记，多练几遍！"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PracticePage() {
  const [backendQuestions, setBackendQuestions] = useState<Question[]>([])
  const [personalQuestions, setPersonalQuestions] = useState<PersonalQuestion[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<string[]>(["全部"])
  const [activeType, setActiveType] = useState<QuestionType | "personal">("classic")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Question | null>(null)
  const [intentTags, setIntentTags] = useState<string[]>([])
  const [intentBanner, setIntentBanner] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const intentParam = params.get("intent")
    if (intentParam) {
      const tags = intentParam.split(",").map(t => t.trim()).filter(Boolean)
      setIntentTags(tags)
      const cats: string[] = JSON.parse(sessionStorage.getItem("practice_intent_cats") || "[]")
      if (cats.length > 0 && cats[0]) setActiveCategory(cats[0])
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [qRes, sRes, catRes] = await Promise.all([
          fetch(`${API}/api/v1/practice/questions?limit=100`),
          fetch(`${API}/api/v1/practice/stats`),
          fetch(`${API}/api/v1/practice/categories`),
        ])
        const qData = await qRes.json()
        const sData = await sRes.json()
        const catData = await catRes.json()
        setBackendQuestions((qData.questions || []).map((q: Question) => ({ ...q, question_type: "classic" })))
        setStats(sData)
        if (Array.isArray(catData) && catData.length > 0) {          setCategories(["全部", ...catData.map((c: { category: string }) => c.category)])
        }
      } catch {
        setBackendQuestions([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allQuestions: Question[] = [...backendQuestions, ...EXTRA_QUESTIONS]
  const typeFiltered = allQuestions.filter(q => (q.question_type || "classic") === activeType)
  const filtered = typeFiltered.filter(q => {
    const catOk = activeCategory === "全部" || q.category === activeCategory
    const searchOk = !search || q.question.includes(search) || q.tags?.some(t => t.includes(search))
    return catOk && searchOk
  })

  const typeConfig = QUESTION_TYPES.find(t => t.key === activeType)!
  const selectedTypeConfig = selected
    ? QUESTION_TYPES.find(t => t.key === (selected.question_type || "classic"))!
    : typeConfig

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      <div className="mb-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">Practice Center</p>
        <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">刷题中心</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">产品经理面试题库 · 4种题型针对性练习</p>
      </div>

      {/* 意向推荐横幅 */}
      {intentTags.length > 0 && intentBanner && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-main)] mb-1.5">根据你的求职意向，推荐以下题目</p>
            <div className="flex flex-wrap gap-2">
              {intentTags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-[var(--primary)] text-white rounded-full font-medium">{tag}</span>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">已自动切换到相关分类，点击题目开始练习</p>
          </div>
          <button onClick={() => setIntentBanner(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-sub)] shrink-0">×</button>
        </div>
      )}

      {/* 题型 Tab（含「我的清单」）*/}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-5">
        {QUESTION_TYPES.map(t => {
          const count = allQuestions.filter(q => (q.question_type || "classic") === t.key).length
          return (
            <button key={t.key} onClick={() => setActiveType(t.key)}
              className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                activeType === t.key
                  ? `${t.bgColor} ${t.borderColor} border-2`
                  : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface2)]"
              }`}>
              <div className={`text-xs font-semibold ${activeType === t.key ? t.color : "text-[var(--text-main)]"}`}>{t.label}</div>
              <div className={`text-[10px] font-bold mt-0.5 ${activeType === t.key ? t.color : "text-[var(--text-muted)]"}`}>{count} 道</div>
            </button>
          )
        })}
        {/* 我的清单 — 同行 */}
        <button onClick={() => { setActiveType("personal"); api.practice.getPersonal().then(setPersonalQuestions).catch(() => {}) }}
          className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
            activeType === "personal"
              ? "bg-emerald-50 border-emerald-300 border-2"
              : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface2)]"
          }`}>
          <div className={`text-xs font-semibold ${activeType === "personal" ? "text-emerald-700" : "text-[var(--text-main)]"}`}>
            我的清单
          </div>
          <div className={`text-[10px] font-bold mt-0.5 ${activeType === "personal" ? "text-emerald-700" : "text-[var(--text-muted)]"}`}>{personalQuestions.length} 题</div>
        </button>
      </div>

      {/* 我的清单内容 */}
      {activeType === "personal" ? (
        <div className="space-y-3">
          {personalQuestions.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p className="text-3xl mb-3">⭐</p>
              <p className="text-sm font-medium mb-1">还没有题目</p>
              <p className="text-xs">在投递看板的面试复盘里，点击「+ 练习」把真实面试题加入清单</p>
            </div>
          ) : (
            personalQuestions.map(pq => (
              <div key={pq.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={async () => {
                      await api.practice.togglePracticed(pq.id)
                      setPersonalQuestions(prev => prev.map(q =>
                        q.id === pq.id ? { ...q, is_practiced: q.is_practiced ? 0 : 1 } : q
                      ))
                    }}
                    className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      pq.is_practiced
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-[var(--border)] hover:border-emerald-400"
                    }`}
                  >
                    {pq.is_practiced ? <span className="text-xs">✓</span> : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${pq.is_practiced ? "line-through text-[var(--text-muted)]" : "text-[var(--text-main)]"}`}>
                      {pq.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {pq.source_company && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{pq.source_company}</span>
                      )}
                      {pq.source_round && (
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{pq.source_round}</span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">{pq.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await api.practice.deletePersonal(pq.id)
                      setPersonalQuestions(prev => prev.filter(q => q.id !== pq.id))
                    }}
                    className="shrink-0 text-[var(--text-muted)] hover:text-red-500 text-xs transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
      {/* 搜索 + 分类 */}
      <div className="mb-4 space-y-2.5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`搜索${typeConfig.label}关键词...`}
          className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] bg-[var(--surface)] focus:outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"
        />
        {activeType === "classic" && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  activeCategory === c
                    ? "bg-[var(--primary)] text-white font-medium"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-sub)] hover:border-[var(--primary)]"
                }`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 题目列表 */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-sm">加载题目中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-sm">暂无匹配题目</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)] mb-3">共 {filtered.length} 道题</p>
          <div className="space-y-3">
            {filtered.map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                typeConfig={QUESTION_TYPES.find(t => t.key === (q.question_type || "classic"))!}
                onClick={() => setSelected(q)}
              />
            ))}
          </div>
        </>
      )}
      </>
    )}

      {selected && activeType !== "personal" && (
        <QuestionDetail q={selected} typeConfig={selectedTypeConfig} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
