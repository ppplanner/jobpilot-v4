"use client"

import { useState } from "react"
import Link from "next/link"
import { SHEET_GRID } from "@/components/blueprint"

const STEPS = [
  {
    num: 1,
    icon: "📋",
    title: "进入简历工作台",
    desc: "点击首页「简历工作台」入口，开始你的简历优化之旅",
    detail: "简历工作台是 JobPilot 的核心功能。在这里你可以上传原始简历，粘贴目标岗位 JD，AI 将为你生成定制化的改写版本并左右对比展示。",
    action: "前往简历工作台",
    href: "/resume",
    color: "from-[#E07B39] to-[#C06030]",
    bgLight: "bg-orange-50",
    border: "border-orange-200",
    accent: "text-orange-600",
    demo: (
      <div className="rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#E07B39] to-[#C06030] px-4 py-3 text-white">
          <p className="text-sm font-semibold">简历工作台</p>
          <p className="text-xs opacity-75">拖拽上传 → 输入JD → 对比改写</p>
        </div>
        <div className="p-4 flex gap-3">
          <div className="flex-1 border-2 border-dashed border-orange-200 rounded-lg p-3 text-center text-xs text-orange-400">
            <div className="text-2xl mb-1">📄</div>
            拖拽简历到这里
          </div>
          <div className="flex items-center text-orange-300 text-lg">→</div>
          <div className="flex-1 border border-gray-200 rounded-lg p-3 text-xs text-gray-400 bg-gray-50">
            <div className="font-medium text-gray-600 mb-1">粘贴JD</div>
            <div className="text-xs leading-relaxed line-clamp-3">岗位要求：熟悉B端产品设计，有SaaS经验优先...</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: 2,
    icon: "⬆️",
    title: "上传你的简历",
    desc: "支持 PDF / Word / TXT 拖拽上传，或直接在框内粘贴简历文字",
    detail: "上传后系统会自动提取文字内容，同时显示原始字数。你可以在文本框内直接编辑，也可以设置目标字数让 AI 帮你控制篇幅。",
    action: "上传简历",
    href: "/resume",
    color: "from-[#6366F1] to-[#4F46E5]",
    bgLight: "bg-indigo-50",
    border: "border-indigo-200",
    accent: "text-indigo-600",
    demo: (
      <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-sm p-4 space-y-3">
        <div className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center bg-indigo-50">
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm font-medium text-indigo-700">已从「简历_2024.pdf」提取 842 字</p>
          <p className="text-xs text-indigo-400 mt-1">✅ 解析成功</p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-gray-500">原始字数：</span>
            <span className="font-semibold text-gray-800">842 字</span>
          </div>
          <div className="flex-1 bg-indigo-50 border border-indigo-300 rounded-lg px-3 py-2">
            <span className="text-indigo-500">目标字数：</span>
            <span className="font-semibold text-indigo-700">900 字</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: 3,
    icon: "📝",
    title: "粘贴岗位 JD",
    desc: "复制目标职位描述，支持直接粘贴截图（AI 自动识别文字）",
    detail: "JD 是简历定制化的关键。AI 会分析 JD 中的关键词和能力要求，将你的简历内容与之精准匹配。支持截图粘贴，无需手动输入。",
    action: "了解JD匹配",
    href: "/resume",
    color: "from-[#059669] to-[#047857]",
    bgLight: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "text-emerald-600",
    demo: (
      <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm p-4 space-y-2">
        <div className="text-xs font-medium text-emerald-700">支持 Ctrl+V 粘贴截图</div>
        <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 text-xs text-emerald-800 leading-relaxed">
          <p className="font-medium mb-1">【岗位JD已识别】</p>
          <p>• 负责B端SaaS产品的需求分析与规划</p>
          <p>• 3年以上产品经理经验，有ERP/CRM经验优先</p>
          <p>• 熟悉SQL，具备数据分析能力...</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          ✅ 已识别 328 字，关键词匹配中...
        </div>
      </div>
    ),
  },
  {
    num: 4,
    icon: "✨",
    title: "查看 AI 改写结果",
    desc: "左右对比原简历与改写版本，高亮显示 AI 新增/修改的内容",
    detail: "改写结果以双栏对比形式展示，黄色高亮标注所有 AI 新增或改写的文字，让你清晰看到每一处变化。支持「轻修」和「精修」两种力度。",
    action: "查看改写示例",
    href: "/resume",
    color: "from-[#D97706] to-[#B45309]",
    bgLight: "bg-amber-50",
    border: "border-amber-200",
    accent: "text-amber-700",
    demo: (
      <div className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex gap-2 text-xs">
          <span className="text-amber-700 font-medium">实习经历</span>
          <span className="text-amber-500">字节跳动 · 产品实习</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-amber-100">
          <div className="p-3 text-xs text-gray-500 leading-relaxed">
            <p className="font-medium text-gray-400 mb-1.5">原始简历</p>
            负责产品需求文档编写，参与用户调研，协助产品迭代。
          </div>
          <div className="p-3 text-xs leading-relaxed bg-amber-50/30">
            <p className="font-medium text-amber-600 mb-1.5">改写结果</p>
            <span>主导</span>
            <mark className="bg-yellow-100 text-yellow-900 px-0.5 rounded mx-0.5">商家中台权限管理模块</mark>
            需求分析，完成
            <mark className="bg-yellow-100 text-yellow-900 px-0.5 rounded mx-0.5">15家商家用户访谈</mark>
            ，推动配置完成率提升
            <mark className="bg-yellow-100 text-yellow-900 px-0.5 rounded mx-0.5">81%</mark>。
          </div>
        </div>
      </div>
    ),
  },
  {
    num: 5,
    icon: "🔍",
    title: "面试官视角评判",
    desc: "AI 扮演面试官，分析简历薄弱点，预判可能被追问的问题",
    detail: "完成改写后，点击「面试官视角分析」，AI 将对照 JD 逐一评估你的简历覆盖度，找出薄弱点，并预测面试官最可能追问的问题，帮你提前准备。",
    action: "开始分析",
    href: "/resume",
    color: "from-[#7C3AED] to-[#6D28D9]",
    bgLight: "bg-violet-50",
    border: "border-violet-200",
    accent: "text-violet-700",
    demo: (
      <div className="rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-violet-800">综合评分</span>
          <span className="text-2xl font-bold text-violet-600">78<span className="text-sm font-normal text-gray-400">/100</span></span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "数据分析能力", status: "strong", text: "命中" },
            { label: "项目管理经验", status: "weak",   text: "较弱" },
            { label: "跨部门协作",   status: "missing", text: "缺失" },
          ].map((item) => (
            <div key={item.label} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg ${
              item.status === "strong" ? "bg-green-50 text-green-700" :
              item.status === "weak"   ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              <span>{item.label}</span>
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: 6,
    icon: "📚",
    title: "题库刷题备考",
    desc: "针对目标岗位的面试题库，涵盖情景题、数据题、压力反问题",
    detail: "题库包含 4 种题型：常规面试题、行业情景题、数据诊断题、压力反问题。每道题附有答题框架和参考答案，刷完即可标记掌握状态，系统自动记录进度。",
    action: "开始刷题",
    href: "/practice",
    color: "from-[#0891B2] to-[#0E7490]",
    bgLight: "bg-cyan-50",
    border: "border-cyan-200",
    accent: "text-cyan-700",
    demo: (
      <div className="rounded-xl border border-cyan-200 bg-white overflow-hidden shadow-sm p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { type: "📚 常规题", color: "bg-blue-50 text-blue-700 border-blue-200",     count: "30+ 道" },
            { type: "🏭 情景题", color: "bg-purple-50 text-purple-700 border-purple-200", count: "8 道" },
            { type: "📊 数据诊断", color: "bg-amber-50 text-amber-700 border-amber-200", count: "5 道" },
            { type: "🔥 压力题", color: "bg-red-50 text-red-700 border-red-200",         count: "6 道" },
          ].map(t => (
            <div key={t.type} className={`border rounded-lg px-2.5 py-2 ${t.color}`}>
              <p className="font-medium">{t.type}</p>
              <p className="text-xs opacity-75 mt-0.5">{t.count}</p>
            </div>
          ))}
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2 text-xs text-cyan-700">
          ✅ 已练习 24 题 · 正确率 83%
        </div>
      </div>
    ),
  },
  {
    num: 7,
    icon: "📊",
    title: "投递看板跟踪进度",
    desc: "记录所有投递，跟踪面试状态，从意向到 Offer 全流程可视化",
    detail: "简历改写完成后，投递信息会自动同步到看板。你也可以手动添加任意投递记录，按阶段筛选，不漏掉每一个面试机会，让求职进度一目了然。",
    action: "查看投递看板",
    href: "/tracker",
    color: "from-[#DC2626] to-[#B91C1C]",
    bgLight: "bg-red-50",
    border: "border-red-200",
    accent: "text-red-600",
    demo: (
      <div className="rounded-xl border border-red-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-red-800">投递看板</span>
          <div className="flex gap-2 text-xs">
            <span className="bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-full">5 投递中</span>
            <span className="bg-green-50 border border-green-200 text-green-600 px-2 py-0.5 rounded-full">1 Offer</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { company: "字节跳动", pos: "B端产品经理", status: "面试中", color: "bg-blue-100 text-blue-700" },
            { company: "阿里巴巴", pos: "供应链PM",    status: "已投递", color: "bg-gray-100 text-gray-600" },
            { company: "美团",     pos: "增长产品",    status: "已offer", color: "bg-green-100 text-green-700" },
          ].map(item => (
            <div key={item.company} className="px-4 py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-medium text-gray-800">{item.company}</p>
                <p className="text-gray-400">{item.pos}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: 8,
    icon: "🤖",
    title: "AI 认识你了",
    desc: "AI 助手会自动读取你的求职进度，给出针对你现状的建议；改写结果可直接导出 PDF 投递",
    detail: "当你在投递看板记录了进展、在面试复盘填写了薄弱点后，AI 对话会自动感知这些信息：知道你投了哪些公司、哪场面试没发挥好、现在处于哪个阶段。你不需要每次都向 AI 重新介绍自己。\n\n简历改写完成后，Step 3 顶部有「导出 PDF」按钮，点击后弹出浏览器打印对话框，选择「另存为 PDF」即可获得一份可直接投递的简历文件。",
    action: "去填写投递看板",
    href: "/tracker",
    color: "from-[#0F766E] to-[#0D9488]",
    bgLight: "bg-teal-50",
    border: "border-teal-200",
    accent: "text-teal-700",
    demo: (
      <div className="rounded-xl border border-teal-200 bg-white overflow-hidden shadow-sm space-y-3 p-4">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-800 space-y-1.5">
          <p className="font-semibold text-teal-700 mb-1">AI 已读取你的求职状态</p>
          <p>· 投递 12 家，进行中 5 家</p>
          <p>· 近期活跃：字节（产品实习·二面中）</p>
          <p>· 复盘薄弱点：数据分析框架不完整</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
          <span className="font-medium text-teal-700">AI：</span>
          你现在在准备字节二面，根据你上次复盘记录，数据分析是薄弱项。建议重点练习「DAU 下降诊断」和「A/B 实验设计」这两类题……
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button className="flex-1 py-1.5 border border-teal-300 text-teal-700 rounded-lg text-xs font-medium bg-teal-50">
            导出 PDF
          </button>
          <p className="text-xs text-gray-400 flex-1">改写完成后在顶部点击，浏览器打印→另存为 PDF</p>
        </div>
      </div>
    ),
  },
]

export default function OnboardingPage() {
  const [activeStep, setActiveStep] = useState(0)
  const step = STEPS[activeStep]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      {/* 顶部标题 */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[var(--surface2)] border border-[var(--border)] rounded-full px-4 py-1.5 text-sm text-[var(--text-sub)] font-medium mb-4">
          功能导览
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-main)] font-cartoon mb-3">5 分钟了解 JobPilot</h1>
        <p className="text-[var(--text-muted)] text-sm max-w-xl mx-auto">
          从简历上传到投递跟踪，8 个步骤带你走完完整的 AI 求职全流程
        </p>
      </div>

      {/* 步骤导航 */}
      <div className="flex items-center justify-center gap-1.5 mb-10 flex-wrap">
        {STEPS.map((s, i) => (
          <button key={s.num} onClick={() => setActiveStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === activeStep
                ? "bg-[var(--primary)] text-white shadow-md scale-105"
                : i < activeStep
                ? "bg-[var(--surface2)] text-[var(--text-sub)] border border-[var(--primary)]/30"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/40"
            }`}>
            <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
              i === activeStep ? "bg-white text-[var(--primary)]" :
              i < activeStep  ? "bg-[var(--primary)] text-white" :
              "bg-[var(--border)] text-[var(--text-muted)]"
            }`}>
              {i < activeStep ? "✓" : s.num}
            </span>
            <span className="hidden sm:inline">{s.title.split(" ").slice(0, 2).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* 当前步骤内容 */}
      <div className="grid lg:grid-cols-2 gap-8 items-start mb-10">
        <div className="space-y-5">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${step.bgLight} ${step.border} ${step.accent}`}>
            <span>{step.icon}</span>
            Step {step.num} / {STEPS.length}
          </div>

          <h2 className="text-xl font-bold text-[var(--text-main)] leading-tight">{step.title}</h2>
          <p className="text-sm text-[var(--text-sub)] font-medium">{step.desc}</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.detail}</p>

          <div className="flex gap-3 pt-2">
            <Link href={step.href}
              className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium bg-gradient-to-r ${step.color} hover:shadow-lg transition-all`}>
              {step.action} →
            </Link>
            {activeStep < STEPS.length - 1 && (
              <button onClick={() => setActiveStep(activeStep + 1)}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">
                下一步
              </button>
            )}
            {activeStep === STEPS.length - 1 && (
              <Link href="/"
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">
                开始使用
              </Link>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-8">
          <div className={`p-5 rounded-2xl border-2 ${step.border} ${step.bgLight}`}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">功能预览</p>
            {step.demo}
          </div>
        </div>
      </div>

      {/* 全部步骤概览 */}
      <div className="border-t border-[var(--border)] pt-8">
        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4 text-center">全流程一览</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STEPS.map((s, i) => (
            <button key={s.num} onClick={() => setActiveStep(i)}
              className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
                i === activeStep
                  ? "border-[var(--primary)] bg-[var(--primary-bg)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40"
              }`}>
              <div className="text-xl mb-1.5">{s.icon}</div>
              <p className={`text-xs font-semibold leading-tight ${i === activeStep ? "text-[var(--primary)]" : "text-[var(--text-main)]"}`}>
                {s.title}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Step {s.num}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 bg-[var(--primary)] rounded-2xl p-8 text-center text-white">
        <h3 className="text-lg font-bold mb-2">准备好了吗？</h3>
        <p className="text-sm opacity-80 mb-6">上传你的简历，让 AI 帮你打造一份更有竞争力的求职材料</p>
        <div className="flex justify-center gap-3">
          <Link href="/resume"
            className="px-6 py-2.5 bg-white text-[var(--primary)] rounded-xl text-sm font-bold hover:shadow-lg transition-all">
            立即开始
          </Link>
          <Link href="/"
            className="px-6 py-2.5 bg-white/20 border border-white/40 text-white rounded-xl text-sm font-medium hover:bg-white/30 transition-all">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
