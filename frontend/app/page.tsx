"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useProfile } from "@/lib/useProfile"
import { api, CalendarEvent, CustomCalendarEvent, ResumeVersion, MyTag, JdTag } from "@/lib/api"
import { SHEET_GRID, SheetCorners, SheetCode } from "@/components/blueprint"

const API = ""

// ===== 能力胶囊:领域配色(低饱和大地色系,贴合墨绿/薄荷/米杏色卡) =====
// 图标方块用实色(白字),药丸用同色系浅底深字
const DOMAIN_STYLE: Record<string, { icon: string; pill: string; name: string }> = {
  direction: { icon: "bg-[#2E5B54]", pill: "bg-[#E4EBE2] text-[#2E5B54]", name: "产品方向" }, // 墨绿
  method:    { icon: "bg-[#5E7E52]", pill: "bg-[#E8EDDC] text-[#4C6840]", name: "核心方法" }, // 橄榄绿
  domain:    { icon: "bg-[#B07A52]", pill: "bg-[#F0E6D9] text-[#8A5A38]", name: "行业领域" }, // 陶土
  tooling:   { icon: "bg-[#5B7E86]", pill: "bg-[#E2EBEC] text-[#436069]", name: "工具素养" }, // 灰蓝绿
  soft:      { icon: "bg-[#9C8B70]", pill: "bg-[#ECE6DA] text-[#6E5F48]", name: "通用素养" }, // 驼
}
// JD 需求标签按命中状态着色(同样降饱和):缺口=陶土红、部分=赭黄、命中=苔绿
const STATUS_STYLE: Record<string, { icon: string; pill: string; label: string }> = {
  命中: { icon: "bg-[#4F8063]", pill: "bg-[#E3EDE3] text-[#3C6B4E]", label: "命中" },
  部分: { icon: "bg-[#C0954E]", pill: "bg-[#F2E9D6] text-[#876426]", label: "部分" },
  缺口: { icon: "bg-[#B6634A]", pill: "bg-[#F1E0DA] text-[#9E4631]", label: "缺口" },
}
const DOMAIN_ORDER = ["direction", "method", "domain", "tooling", "soft"]

type SketchTone = "green" | "ochre" | "terra" | "muted"
type SketchPose = "point" | "read" | "carry" | "mark"

function LayerBadgeIcon({ tone = "green", label = "" }: { tone?: SketchTone; label?: string }) {
  const accent = tone === "ochre" ? "#C0954E" : tone === "terra" ? "#B6634A" : tone === "muted" ? "#9C8B70" : "#2E5B54"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="6" y="5" width="13.5" height="17" rx="2.2" fill="white" stroke="#102F59" strokeWidth="1.25" opacity="0.96" />
      <path d="M9 10h6.5M9 13.4h8M9 16.8h4.5" stroke="#102F59" strokeWidth="1.15" strokeLinecap="round" opacity="0.76" />
      <path d="M17.5 8.5h4.2v4.2" stroke={accent} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 14.5l6.2-6" stroke={accent} strokeWidth="1.55" strokeLinecap="round" />
      <circle cx="20.9" cy="19.4" r="2.25" fill={accent} />
      {label && <text x="20.9" y="20.55" textAnchor="middle" fontSize="3.8" fontWeight="700" fill="white">{label.slice(0, 1)}</text>}
    </svg>
  )
}

function BlueprintStage({ index, title, sub, done }: { index: string; title: string; sub: string; done: boolean }) {
  return (
    <div className={`relative rounded-xl border px-3 py-2 ${done ? "border-[var(--accent)] bg-white/14" : "border-white/22 bg-white/7"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{index}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-[var(--accent)]" : "bg-white/30"}`} />
      </div>
      <p className="mt-1 text-xs font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-white/58">{sub}</p>
    </div>
  )
}

function PlanPersonIcon({ tone = "green", pose = "point" }: { tone?: SketchTone; pose?: SketchPose }) {
  const accent = tone === "ochre" ? "#C0954E" : tone === "terra" ? "#B6634A" : tone === "muted" ? "#9C8B70" : "#2E5B54"
  const navy = "#102F59"
  const skin = "#F7F1E8"
  const isWarm = tone === "ochre" || tone === "terra"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4.5 23.2h19" stroke={navy} strokeWidth="1.1" strokeLinecap="round" opacity="0.16" />
      {pose === "read" && (
        <>
          <rect x="15.4" y="8.5" width="7.1" height="10.5" rx="1.1" fill="white" stroke={navy} strokeWidth="1.1" />
          <path d="M17.4 11.3h3.2M17.4 14h2.7" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="10" cy="7.1" r="2.15" fill={skin} stroke={navy} strokeWidth="1.25" />
          <path d="M8.1 6.5c.6-2 3.6-2 4 .4" stroke={navy} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M10.1 9.5l-1 6.7h4.8l-1.4-6.1" fill={accent} opacity="0.88" />
          <path d="M10.3 10.1l-2.7 4.1M12.6 11.3l3.2 2M9.2 16.1l-2 5.5M13.7 16.1l1.6 5.5" stroke={navy} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {pose === "carry" && (
        <>
          <circle cx="13.6" cy="7.1" r="2.15" fill={skin} stroke={navy} strokeWidth="1.25" />
          <path d="M12.1 5.7c1.2-1.3 3.6-.5 3.9 1.2" fill={navy} />
          <path d="M13.4 9.6l-1.8 6.5h5.3l-.8-5.9" fill={isWarm ? navy : accent} opacity="0.95" />
          <rect x="5.4" y="13.3" width="5.2" height="6.2" rx="1" fill={accent} stroke={navy} strokeWidth="1.05" />
          <path d="M11.8 11.3l-3.1 2.2M16.1 11.1l3.8 3.2M12 16.1l-3.1 5.8M16.6 16.1l3.8 5.4" stroke={navy} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 14.3l2.2-1.2" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {pose === "mark" && (
        <>
          <rect x="14.8" y="6.2" width="8" height="8.8" rx="1.1" fill="white" stroke={navy} strokeWidth="1.1" />
          <path d="M17 9h3.2M17 11.7h2" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="9.4" cy="8.2" r="2.15" fill={skin} stroke={navy} strokeWidth="1.25" />
          <path d="M7.6 7.2c1-1.9 3.8-1.5 4.1.4" fill={navy} />
          <path d="M9.6 10.6l-2.7 5.7h5.4l-.5-4.8" fill={accent} opacity="0.9" />
          <path d="M11.7 11.6l4.2-1.1M8 13.2l-3.1 2.3M7.1 16.2l-2.3 5.4M12.2 16.2l2.2 5.4" stroke={navy} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="21.8" cy="17.7" r="1.45" fill={accent} />
        </>
      )}
      {pose === "point" && (
        <>
          <circle cx="13.8" cy="7" r="2.2" fill={skin} stroke={navy} strokeWidth="1.25" />
          <path d="M11.9 6.3c.7-2 3.9-1.7 4.2.5" stroke={navy} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M13.9 9.6v6.3" stroke={navy} strokeWidth="1.25" strokeLinecap="round" />
          <path d="M11.1 13.1l2.8-2.2l3.2 2.5" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.1 15.8l-2.4 5.5M15.7 15.8l2.5 5.5" stroke={navy} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 12.4l3.8-2.1" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="22.1" cy="9.9" r="1.55" fill={accent} />
        </>
      )}
    </svg>
  )
}

function VersionSketch({ tier }: { tier: "high" | "mid" | "low" | "none" }) {
  const tone: SketchTone = tier === "high" ? "green" : tier === "mid" ? "ochre" : tier === "low" ? "terra" : "muted"
  const pose: SketchPose = tier === "high" ? "mark" : tier === "mid" ? "read" : tier === "low" ? "carry" : "point"
  const accent = tone === "ochre" ? "#C0954E" : tone === "terra" ? "#B6634A" : tone === "muted" ? "#9C8B70" : "#4F8063"
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-4 top-4 h-12 rounded-lg border border-white/70 bg-white/40" />
      <div className="absolute left-7 top-7 h-1.5 w-14 rounded-full bg-white/80" />
      <div className="absolute left-7 top-11 h-1.5 w-9 rounded-full bg-white/70" />
      <div className="absolute right-6 top-5 h-10 w-6 rounded-b-full border border-[#102F59]/20 bg-white/30" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <PlanPersonIcon tone={tone} pose={pose} />
      </div>
      <span className="absolute right-5 bottom-5 h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
    </div>
  )
}


// ===== 练习方向标签 =====
const INTENT_TAGS = [
  { key: "B端PM",   label: "B端PM",   cat: "B端PM" },
  { key: "C端PM",   label: "C端PM",   cat: "C端PM" },
  { key: "增长PM",  label: "增长PM",  cat: "增长PM" },
  { key: "数据PM",  label: "数据PM",  cat: "数据PM" },
  { key: "AI PM",   label: "AI PM",   cat: "AI PM" },
  { key: "行为面试", label: "行为面试", cat: "通用PM" },
  { key: "压力题",  label: "压力反问", cat: "通用PM" },
]

// ===== 招聘季静态数据（月份 1-indexed）=====
const SEASONS = [
  { name: "秋招", start: [8, 1],  end: [10, 31], bg: "rgba(251,191,36,0.13)",  accent: "#f59e0b" },
  { name: "春招", start: [2, 1],  end: [4, 30],  bg: "rgba(99,102,241,0.10)",  accent: "#6366f1" },
  { name: "实习", start: [3, 1],  end: [6, 15],  bg: "rgba(16,185,129,0.10)",  accent: "#10b981" },
]

function getSeasonForDate(month: number, day: number) {
  for (const s of SEASONS) {
    const after  = month > s.start[0] || (month === s.start[0] && day >= s.start[1])
    const before = month < s.end[0]   || (month === s.end[0]   && day <= s.end[1])
    if (after && before) return s
  }
  return null
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

// ===== 类型 =====
interface Timeline { start_date: string; target_date: string }
interface ActiveReminder { key: string; type: "inactivity" | "season" | "goal"; icon: string; message: string; subtext?: string }

function loadTimeline(): Timeline {
  if (typeof window === "undefined") return { start_date: "", target_date: "" }
  try { return { start_date: "", target_date: "", ...JSON.parse(localStorage.getItem("jobpilot_timeline") || "{}") } }
  catch { return { start_date: "", target_date: "" } }
}

// ===== 新功能公告 Modal =====
// ===== 首次打开引导弹窗(3 页轮播) =====
// 三页示意图:高仿真复刻真实界面布局,内容用真实示例并隐去关键信息

function RewriteMock() {
  const hl = "bg-yellow-100 text-yellow-900 rounded px-0.5"
  return (
    <div className="h-full flex flex-col text-[11px] leading-relaxed">
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* 原文 */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
          <div className="px-2.5 py-1.5 bg-[var(--surface2)] border-b border-[var(--border)] text-[10px] font-semibold text-[var(--text-muted)]">原文</div>
          <div className="p-2.5 text-[var(--text-sub)] space-y-1 overflow-hidden">
            <p className="font-semibold text-[var(--text-main)]">某规划设计院 · 实习生</p>
            <p>完成地块控规图纸与图则修改，独立承担城市设计辅助工作</p>
          </div>
        </div>
        {/* 改写后 */}
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[#FFFDF9] overflow-hidden flex flex-col">
          <div className="px-2.5 py-1.5 bg-[var(--primary-bg)] border-b border-[var(--primary)]/20 text-[10px] font-semibold text-[var(--primary)]">改写后</div>
          <div className="p-2.5 text-[var(--text-main)] space-y-1 overflow-hidden">
            <p className="font-semibold">某规划设计院 · <mark className={hl}>产品实习</mark></p>
            <p><mark className={hl}>主导 7 个</mark>地块方案的<mark className={hl}>需求梳理与交付</mark>，独立负责核心模块设计</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-muted)] text-center">黄色高亮 = AI 新增 / 强化的表达 · 关键信息已隐去</p>
    </div>
  )
}

function InterviewerMock() {
  const items = [
    { s: "命中", txt: "需求分析与方案落地", cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
    { s: "较弱", txt: "数据驱动决策",       cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    { s: "缺失", txt: "AB 实验经验",         cls: "bg-red-50 text-red-700 border-red-200",     dot: "bg-red-500" },
  ]
  return (
    <div className="h-full flex flex-col text-[11px] gap-2">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="text-2xl font-bold text-amber-600 leading-none shrink-0">78<span className="text-xs text-[var(--text-muted)] font-normal">/100</span></div>
        <p className="text-[var(--text-sub)] flex-1 leading-snug">产品思维与项目落地能力突出，<span className="text-[var(--text-main)] font-medium">数据分析经验需补强</span></p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map(it => (
          <div key={it.s} className={`rounded-lg border px-2 py-1.5 ${it.cls}`}>
            <div className="flex items-center gap-1 mb-0.5"><span className={`w-1.5 h-1.5 rounded-full ${it.dot}`} /><span className="font-semibold text-[10px]">{it.s}</span></div>
            <p className="text-[10px] leading-tight">{it.txt}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-[var(--surface2)] border border-[var(--border)] p-2.5">
        <p className="text-[10px] text-[var(--text-muted)] mb-0.5">⚠ 面试官可能追问</p>
        <p className="text-[var(--text-main)] leading-snug">简历写「独立负责」→ <span className="font-medium">具体你主导了哪些关键决策？</span></p>
      </div>
    </div>
  )
}

function JdAnalysisMock() {
  const ring = 72
  const items = [
    { s: "匹配",   txt: "用户研究",       cls: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
    { s: "需强化", txt: "增长策略",       cls: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
    { s: "缺失",   txt: "AIGC 产品应用",  cls: "text-red-700 bg-red-50 border-red-200",       dot: "bg-red-500" },
  ]
  return (
    <div className="h-full flex flex-col text-[11px] gap-2">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <svg width="52" height="52" viewBox="0 0 36 36" className="shrink-0">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#EDE7DC" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${ring} 100`} transform="rotate(-90 18 18)" />
          <text x="18" y="21" textAnchor="middle" fill="#2E5B54" fontSize="10" fontWeight="700">{ring}</text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-main)] leading-snug">某互联网大厂 · 策略产品经理 <span className="ml-1 text-[10px] font-medium text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">中等匹配</span></p>
          <p className="text-[var(--text-sub)] mt-0.5 text-[10px]">产品基础扎实，建议补充 AIGC 相关实践</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map(it => (
          <div key={it.s} className={`rounded-lg border px-2 py-1.5 ${it.cls}`}>
            <div className="flex items-center gap-1 mb-0.5"><span className={`w-1.5 h-1.5 rounded-full ${it.dot}`} /><span className="font-semibold text-[10px]">{it.s}</span></div>
            <p className="text-[10px] leading-tight">{it.txt}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-2">
          <p className="font-semibold text-red-700 mb-0.5">必须补充</p>
          <p className="text-[var(--text-sub)]">! AIGC 产品案例</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-2">
          <p className="font-semibold text-green-700 mb-0.5">可突出</p>
          <p className="text-[var(--text-sub)]">★ 跨学科研究能力</p>
        </div>
      </div>
    </div>
  )
}

function OnboardingGuideModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const STEPS = [
    { title: "① 简历改写",       subtitle: "对着目标 JD，把你的经历改写成岗位想看的样子",          mock: <RewriteMock /> },
    { title: "② 面试官视角分析", subtitle: "AI 以面试官视角给简历打分，点出命中、薄弱与会被追问处", mock: <InterviewerMock /> },
    { title: "③ JD 分析",        subtitle: "粘贴岗位 JD，逐项看清匹配度、必须补充与可突出的亮点",    mock: <JdAnalysisMock /> },
  ]
  const isLast = step === STEPS.length - 1
  const cur = STEPS[step]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] text-base leading-none">×</button>
        {/* 进度条 */}
        <div className="flex gap-1.5 mb-4 pr-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
          ))}
        </div>
        <p className="text-xs text-[var(--primary)] font-semibold mb-1">开始前，先认识 3 个核心功能</p>
        <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">{cur.title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-3">{cur.subtitle}</p>
        {/* 示意图区(固定高度,保证三页同尺寸) */}
        <div className="h-[212px] rounded-xl border border-[var(--border)] bg-[var(--surface2)]/40 p-3 mb-4">
          {cur.mock}
        </div>
        {/* 按钮区 */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">跳过</button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">上一步</button>
            )}
            {isLast ? (
              <Link href="/resume" onClick={onClose}
                className="px-5 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity">立即开始 →</Link>
            ) : (
              <button onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity">下一步</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== 练习方向选择面板 =====
function IntentTagPanel({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (key: string) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const go = () => {
    if (!selected.length) return
    const cats = [...new Set(selected.map(k => INTENT_TAGS.find(t => t.key === k)?.cat || ""))]
    sessionStorage.setItem("practice_intent_tags", JSON.stringify(selected))
    sessionStorage.setItem("practice_intent_cats", JSON.stringify(cats))
    window.location.href = `/practice?intent=${encodeURIComponent(selected.join(","))}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--text-main)] text-sm">选择今天要练习的方向</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">系统自动推荐匹配题目</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-base leading-none">×</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {INTENT_TAGS.map(t => (
            <button key={t.key} onClick={() => toggle(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selected.includes(t.key)
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-[var(--surface2)] text-[var(--text-sub)] border-[var(--border)] hover:border-[var(--primary)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">
            取消
          </button>
          <button onClick={go} disabled={!selected.length}
            className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            开始刷题 {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== 求职小猫 IP =====
function JobCat({ stage }: { stage: number }) {
  const B  = "#E8C49A"   // 猫体暖米色
  const EB = "#F5B8C4"   // 内耳粉色
  const D  = "#3D1F0A"   // 深棕（眼睛）
  const P  = "#C17A3B"   // 产品主色
  const G  = "#9CA3AF"   // 胡须灰
  const W  = "#FFFFFF"

  const info = [
    { label: "蓄势待发",    sub: "投出你的第一份简历吧",   bubble: "再睡一会儿... 😪" },
    { label: "初入江湖",    sub: "求职旅程已经启程！",      bubble: "加油！第一步最重要！" },
    { label: "广撒网中",    sub: "节奏不错，继续保持～",    bubble: "广撒网，总有一条鱼！🐟" },
    { label: "进入战场",    sub: "已有面试，认真备考！",    bubble: "西装笔挺，准备出发！" },
    { label: "决战时刻",    sub: "关键面试进行中，加油！",  bubble: "深呼吸，你可以的...！" },
    { label: "Offer 到手", sub: "恭喜！目标达成 🎉",       bubble: "赢了！！我赢了！！！🎉" },
  ][Math.min(stage, 5)]

  const isActive = stage >= 1

  return (
    <div className="flex flex-col items-center select-none group relative">
      {/* 悬停气泡 */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-[var(--text-main)] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {info.bubble}
        </div>
        <div className="w-2 h-2 bg-[var(--text-main)] rotate-45 mx-auto -mt-1 rounded-sm" />
      </div>

      <svg width="80" height="84" viewBox="0 0 80 84" fill="none" xmlns="http://www.w3.org/2000/svg">

        {/* ── Stage 0: 蜷缩睡觉 ── */}
        {stage === 0 && <>
          <ellipse cx="40" cy="62" rx="28" ry="18" fill={B} />
          <circle cx="54" cy="46" r="16" fill={B} />
          <path d="M62 36 L70 23 L67 38 Z" fill={B} />
          <path d="M62 36 L68 26 L66 37 Z" fill={EB} />
          <path d="M46 44 Q50 40 54 44" stroke={D} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M54 44 Q58 40 62 44" stroke={D} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="54" cy="49" r="1.5" fill={P} opacity="0.55" />
          <path d="M51 51 Q54 54 57 51" stroke={P} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M14 64 Q6 76 20 78 Q30 79 26 68" stroke={B} strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse cx="34" cy="79" rx="10" ry="5" fill={B} />
          <text x="9"  y="34" fontSize="11" fill={G} fontWeight="600" opacity="0.85">z</text>
          <text x="15" y="24" fontSize="13" fill={G} fontWeight="600" opacity="0.60">z</text>
          <text x="23" y="14" fontSize="10" fill={G} fontWeight="600" opacity="0.38">z</text>
        </>}

        {/* ── Stages 1–5: 坐姿底图 ── */}
        {isActive && <>
          {/* 耳朵 */}
          <path d="M21 22 L13 7 L31 17 Z" fill={B} />
          <path d="M59 22 L67 7 L49 17 Z" fill={B} />
          <path d="M22 21 L16 10 L30 18 Z" fill={EB} />
          <path d="M58 21 L64 10 L50 18 Z" fill={EB} />
          {/* 头 */}
          <circle cx="40" cy="30" r="19" fill={B} />
          {/* 鼻子 */}
          <path d="M38 35 L40 33 L42 35 L40 37 Z" fill={P} opacity="0.6" />
          {/* 胡须 */}
          <line x1="20" y1="32" x2="31" y2="34" stroke={G} strokeWidth="0.8" opacity="0.5" />
          <line x1="20" y1="36" x2="31" y2="37" stroke={G} strokeWidth="0.8" opacity="0.5" />
          <line x1="49" y1="34" x2="60" y2="32" stroke={G} strokeWidth="0.8" opacity="0.5" />
          <line x1="49" y1="37" x2="60" y2="36" stroke={G} strokeWidth="0.8" opacity="0.5" />

          {/* 身体 — 普通（1-2） */}
          {stage <= 2 && <>
            <rect x="35" y="47" width="10" height="11" rx="5" fill={B} />
            <ellipse cx="40" cy="66" rx="16" ry="14" fill={B} />
          </>}
          {/* 身体 — 西装（3-5） */}
          {stage >= 3 && <>
            <rect x="35" y="47" width="10" height="11" rx="5" fill="#374151" />
            <ellipse cx="40" cy="66" rx="16" ry="14" fill="#374151" />
            <path d="M32 47 L40 58 L48 47" fill="#374151" />
            <path d="M36.5 47 L40 58 L43.5 47" fill={W} opacity="0.9" />
            <path d="M37.5 49 L40 58 L42.5 49" fill={P} />
            <rect x="37" y="46" width="6" height="5" rx="2" fill={P} />
          </>}

          {/* 尾巴 */}
          {stage <= 4 && <path d="M55 64 Q68 56 66 70 Q64 79 55 77" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />}
          {stage === 5 && <path d="M24 64 Q8 56 8 72 Q8 82 22 78" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />}

          {/* 眼睛 — Stage 1: 圆眼（好奇） */}
          {stage === 1 && <>
            <circle cx="32" cy="28" r="4" fill={D} />
            <circle cx="48" cy="28" r="4" fill={D} />
            <circle cx="33.2" cy="27" r="1.4" fill={W} />
            <circle cx="49.2" cy="27" r="1.4" fill={W} />
            <path d="M36 38 Q40 42 44 38" stroke={P} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7" />
          </>}

          {/* 眼睛 — Stage 2: 半睁（疲惫专注） */}
          {stage === 2 && <>
            <path d="M27 25 Q32 21 37 25" stroke={D} strokeWidth="2" fill="none" />
            <path d="M43 25 Q48 21 53 25" stroke={D} strokeWidth="2" fill="none" />
            <circle cx="32" cy="28" r="3" fill={D} />
            <circle cx="48" cy="28" r="3" fill={D} />
            <circle cx="33" cy="27" r="1" fill={W} />
            <circle cx="49" cy="27" r="1" fill={W} />
            <path d="M37 38 L43 38" stroke={P} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
          </>}

          {/* 眼睛 — Stage 3: 眉毛+圆眼（严肃） */}
          {stage === 3 && <>
            <path d="M26 23 Q32 20 37 23" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M43 23 Q48 20 54 23" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="32" cy="28" r="3.5" fill={D} />
            <circle cx="48" cy="28" r="3.5" fill={D} />
            <circle cx="33.2" cy="27" r="1.2" fill={W} />
            <circle cx="49.2" cy="27" r="1.2" fill={W} />
            <path d="M37 38 L43 38" stroke={P} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </>}

          {/* 眼睛 — Stage 4: 大睁眼（紧张） */}
          {stage === 4 && <>
            <circle cx="31" cy="28" r="6" fill={W} stroke={D} strokeWidth="1.5" />
            <circle cx="49" cy="28" r="6" fill={W} stroke={D} strokeWidth="1.5" />
            <circle cx="31" cy="29" r="3.8" fill={D} />
            <circle cx="49" cy="29" r="3.8" fill={D} />
            <circle cx="32.2" cy="27.5" r="1.3" fill={W} />
            <circle cx="50.2" cy="27.5" r="1.3" fill={W} />
            <path d="M37 38 Q40 36 43 38" stroke={P} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
            {/* 汗珠 */}
            <path d="M62 11 Q66 6 63 2 Q60 -1 62 5" fill="#93C5FD" opacity="0.85" />
            <path d="M67 22 Q71 17 68 13 Q65 10 67 16" fill="#93C5FD" opacity="0.6" />
            <text x="5" y="22" fontSize="16" fill={P} opacity="0.4" fontWeight="bold">?</text>
          </>}

          {/* 眼睛 — Stage 5: 弯月（大笑） */}
          {stage === 5 && <>
            <path d="M25 26 Q32 18 39 26" stroke={D} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M41 26 Q48 18 55 26" stroke={D} strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M32 36 Q40 45 48 36" stroke={P} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
          </>}

          {/* 配饰 — Stage 1: 简历 */}
          {stage === 1 && <>
            <path d="M30 60 Q18 64 14 72" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="6" y="68" width="12" height="16" rx="2" fill={W} stroke={P} strokeWidth="1.5" />
            <line x1="9" y1="72" x2="15" y2="72" stroke={P} strokeWidth="0.8" opacity="0.5" />
            <line x1="9" y1="75" x2="15" y2="75" stroke={P} strokeWidth="0.8" opacity="0.5" />
            <line x1="9" y1="78" x2="13" y2="78" stroke={P} strokeWidth="0.8" opacity="0.5" />
          </>}

          {/* 配饰 — Stage 2: 一摞简历 */}
          {stage === 2 && <>
            <rect x="2"  y="59" width="14" height="18" rx="2" fill={W} stroke="#E2D4C0" strokeWidth="1" />
            <rect x="4"  y="57" width="14" height="18" rx="2" fill={W} stroke="#D4C4B0" strokeWidth="1" />
            <rect x="6"  y="55" width="14" height="18" rx="2" fill={W} stroke={P}       strokeWidth="1.5" />
            <line x1="9"  y1="61" x2="17" y2="61" stroke={P} strokeWidth="0.8" opacity="0.5" />
            <line x1="9"  y1="64" x2="17" y2="64" stroke={P} strokeWidth="0.8" opacity="0.5" />
            <line x1="9"  y1="67" x2="14" y2="67" stroke={P} strokeWidth="0.8" opacity="0.5" />
            <path d="M30 60 Q20 57 14 62" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />
          </>}

          {/* 配饰 — Stage 3: 公文包 */}
          {stage === 3 && <>
            <path d="M50 60 Q60 60 64 66" stroke="#374151" strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="60" y="62" width="17" height="14" rx="2" fill={W} stroke={P} strokeWidth="1.5" />
            <rect x="64" y="59" width="9" height="5"  rx="2" fill="none"   stroke={P} strokeWidth="1.5" />
            <line x1="60" y1="69" x2="77" y2="69" stroke={P} strokeWidth="1" opacity="0.5" />
          </>}

          {/* 配饰 — Stage 5: 彩带 + 举起双臂 + Offer信 */}
          {stage === 5 && <>
            <rect x="6"  y="8" width="5" height="5" rx="1" fill="#F59E0B" transform="rotate(20  6  8)" opacity="0.9" />
            <rect x="60" y="6" width="5" height="5" rx="1" fill="#6366F1" transform="rotate(-15 60  6)" opacity="0.9" />
            <rect x="17" y="4" width="4" height="4" rx="1" fill="#10B981" transform="rotate(35  17  4)" opacity="0.85" />
            <circle cx="12" cy="20" r="2.5" fill="#F59E0B" opacity="0.75" />
            <circle cx="66" cy="18" r="2"   fill="#EF4444" opacity="0.75" />
            <path d="M66 30 L68 26 L70 30 L68 32 Z" fill="#F59E0B" opacity="0.8" />
            <path d="M28 58 Q16 50 14 40" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M52 58 Q64 50 66 40" stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="58" y="28" width="16" height="20" rx="2" fill={W} stroke={P} strokeWidth="1.5" />
            <line x1="61" y1="34" x2="71" y2="34" stroke={P} strokeWidth="1" opacity="0.6" />
            <line x1="61" y1="38" x2="71" y2="38" stroke={P} strokeWidth="1" opacity="0.6" />
            <line x1="61" y1="42" x2="68" y2="42" stroke={P} strokeWidth="1" opacity="0.6" />
          </>}
        </>}
      </svg>
      <p className="text-xs font-semibold text-[var(--primary)] mt-1 tracking-wide">{info.label}</p>
      <p className="text-xs text-[var(--text-muted)] text-center leading-tight max-w-[96px] mt-0.5">{info.sub}</p>
    </div>
  )
}

// ===== 漏斗进度 =====
function FunnelSection({ apps, practiceTotal, catStage }: { apps: any[]; practiceTotal: number; catStage: number }) {
  const total = apps.length

  if (total === 0) return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">求职进度</p>
      <div className="flex flex-col items-center justify-center text-center py-2">
        <JobCat stage={0} />
        <Link href="/tracker" className="text-xs text-[var(--primary)] hover:underline font-semibold mt-3">去添加第一次投递 →</Link>
      </div>
    </div>
  )

  const stages = [
    { label: "全部投递",  count: total,                                                                       color: "#6366f1" },
    { label: "进入笔试",  count: apps.filter(a => a.status === "笔试").length,                                color: "#8b5cf6" },
    { label: "进入面试",  count: apps.filter(a => ["一面","二面","HR面"].includes(a.status)).length,          color: "#f59e0b" },
    { label: "收到 Offer", count: apps.filter(a => a.status === "Offer").length,                             color: "#059669" },
  ]
  const rejected = apps.filter(a => ["挂","放弃"].includes(a.status)).length

  return (
    <Link href="/tracker"
      className="block bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--primary)]/40 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">求职进度</p>
        <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">查看全部 →</span>
      </div>
      <div className="space-y-3">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-sub)] w-20 shrink-0">{s.label}</span>
            <div className="flex-1 bg-[var(--surface2)] rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(total > 0 ? Math.round(s.count / total * 100) : 0, s.count > 0 ? 8 : 0)}%`, background: s.color }} />
            </div>
            <span className="text-sm font-semibold w-5 text-right shrink-0" style={{ color: s.color }}>{s.count}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[var(--border)]">
        {rejected > 0 && <span className="text-xs text-[var(--text-muted)]">挂/放弃 {rejected} 家</span>}
        {practiceTotal > 0 && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            已刷题 <span className="font-semibold text-[var(--text-main)]">{practiceTotal}</span> 题
          </span>
        )}
      </div>

      {/* 求职小猫 */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-center">
        <JobCat stage={catStage} />
      </div>
    </Link>
  )
}

// ===== 日历自定义事件添加弹窗 =====
const EVENT_TYPES = ["面试", "截止", "备考", "其他"]

function AddEventModal({ defaultDate, onSave, onClose }: {
  defaultDate: string
  onSave: (data: { date: string; title: string; type: string; time: string }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ date: defaultDate, title: "", type: "面试", time: "" })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-[var(--text-main)] text-sm">添加日历事件</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-base leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">事件标题 *</label>
            <input autoFocus value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="如：字节跳动产品面试"
              className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">类型</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]">
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">时间（选填）</label>
              <input type="time" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">日期</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">
            取消
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving}
            className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== 求职时间线设置弹窗 =====
function TimelineSettingsModal({ timeline, onSave, onClose }: {
  timeline: Timeline
  onSave: (tl: Timeline) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Timeline>(timeline)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-[var(--text-main)] text-sm">求职时间线</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">设置后日历将显示你的关键节点</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-base leading-none">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">开始求职日</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-sub)] mb-1.5 block">目标拿 Offer 日</label>
            <input type="date" value={form.target_date}
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          </div>
        </div>
        <div className="mt-4 p-3 bg-[var(--surface2)] rounded-lg space-y-1.5">
          <p className="text-xs text-[var(--text-muted)] mb-1.5">系统自动标注招聘季：</p>
          {SEASONS.map(s => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.accent }} />
              <span className="text-xs text-[var(--text-muted)]">{s.name}：{s.start[0]}月{s.start[1]}日 — {s.end[0]}月{s.end[1]}日</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">
            取消
          </button>
          <button onClick={() => onSave(form)}
            className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== 求职日历 =====
const EVENT_COLORS: Record<string, string> = {
  interview:      "#3b82f6",
  deadline:       "#f59e0b",
  offer_deadline: "#10b981",
  面试:           "#3b82f6",
  截止:           "#f59e0b",
  备考:           "#8b5cf6",
  其他:           "#94a3b8",
}

function JobCalendar({ events, customEvents, timeline, onOpenSettings, onAddEvent, onDeleteCustomEvent }: {
  events: CalendarEvent[]
  customEvents: CustomCalendarEvent[]
  timeline: Timeline
  onOpenSettings: () => void
  onAddEvent: (date: string) => void
  onDeleteCustomEvent: (id: number) => void
}) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = today.toISOString().slice(0, 10)

  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => { (map[e.date] = map[e.date] || []).push(e) })
    return map
  }, [events])

  const customEventMap = useMemo(() => {
    const map: Record<string, CustomCalendarEvent[]> = {}
    customEvents.forEach(e => { (map[e.date] = map[e.date] || []).push(e) })
    return map
  }, [customEvents])

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const m1 = viewMonth + 1 // 1-indexed for season check
  const visibleSeasons = SEASONS.filter(s => !(s.end[0] < m1 || s.start[0] > m1))
  const selectedTrackerEvents = selectedDate ? (eventMap[selectedDate] || []) : []
  const selectedCustomEvents  = selectedDate ? (customEventMap[selectedDate] || []) : []

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">求职日历</p>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface2)] text-[var(--text-muted)] transition-colors text-sm">‹</button>
          <span className="text-xs font-semibold text-[var(--text-main)] px-1 min-w-[60px] text-center">
            {viewYear}年{m1}月
          </span>
          <button onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface2)] text-[var(--text-muted)] transition-colors text-sm">›</button>
          <button onClick={onOpenSettings}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface2)] text-[var(--text-muted)] transition-colors ml-0.5"
            title="设置求职时间线">
            ⚙
          </button>
        </div>
      </div>

      {/* 招聘季图例 */}
      {visibleSeasons.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          {visibleSeasons.map(s => (
            <div key={s.name} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.accent, opacity: 0.9 }} />
              <span className="text-xs text-[var(--text-muted)]">{s.name}</span>
            </div>
          ))}
          {(timeline.start_date || timeline.target_date) && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs leading-none" style={{ color: "#10b981" }}>◆</span>
              <span className="text-xs text-[var(--text-muted)]">时间线</span>
            </div>
          )}
        </div>
      )}

      {/* 星期标题 */}
      <div className="grid grid-cols-7 mb-0.5">
        {["一","二","三","四","五","六","日"].map(d => (
          <div key={d} className="text-xs text-center text-[var(--text-muted)] py-0.5 font-semibold">{d}</div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((day, i) => {
          if (!day) return <div key={i} />
          const ds       = `${viewYear}-${String(m1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday      = ds === todayStr
          const isSelected   = ds === selectedDate
          const dayEvts      = eventMap[ds] || []
          const dayCustom    = customEventMap[ds] || []
          const hasAnyEvent  = dayEvts.length > 0 || dayCustom.length > 0
          const season       = getSeasonForDate(m1, day)
          const isStart      = ds === timeline.start_date
          const isTarget     = ds === timeline.target_date

          // 合并所有点颜色（投递事件实心，自定义事件空心用border表示）
          const trackerTypes = [...new Set(dayEvts.map(e => e.type))].slice(0, 2)
          const customTypes  = [...new Set(dayCustom.map(e => e.type))].slice(0, 2)

          return (
            <button key={i}
              onClick={() => setSelectedDate(isSelected ? null : ds)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all
                ${isToday    ? "bg-[var(--primary)] text-white font-semibold" : "hover:bg-[var(--surface2)] text-[var(--text-main)]"}
                ${isSelected && !isToday ? "ring-1 ring-[var(--primary)]" : ""}
              `}
              style={!isToday && season ? { background: season.bg } : undefined}
            >
              <span className="text-xs leading-tight">{day}</span>
              {/* 事件点：投递看板=实心，自定义=空心 */}
              {hasAnyEvent && (
                <div className="flex gap-0.5 mt-0.5">
                  {trackerTypes.map(type => (
                    <span key={"t" + type} className="w-1 h-1 rounded-full"
                      style={{ background: isToday ? "rgba(255,255,255,0.8)" : EVENT_COLORS[type] || "#888" }} />
                  ))}
                  {customTypes.map(type => (
                    <span key={"c" + type} className="w-1 h-1 rounded-full border"
                      style={{
                        borderColor: isToday ? "rgba(255,255,255,0.8)" : EVENT_COLORS[type] || "#888",
                        background: "transparent",
                      }} />
                  ))}
                </div>
              )}
              {/* 时间线节点标记 */}
              {(isStart || isTarget) && !isToday && (
                <span className="absolute top-0.5 right-0.5 text-xs leading-none"
                  style={{ color: isTarget ? "#ef4444" : "#10b981" }}>◆</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 选中日期的事件列表 */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-[var(--text-muted)]">{selectedDate}</p>
            <button onClick={() => onAddEvent(selectedDate)}
              className="text-xs text-[var(--primary)] hover:underline font-semibold">
              ＋ 添加事件
            </button>
          </div>

          {selectedTrackerEvents.length === 0 && selectedCustomEvents.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">当天无安排，点击右上角添加</p>
          )}

          {/* 投递看板事件（只读） */}
          {selectedTrackerEvents.map((ev, i) => (
            <Link href="/tracker" key={"t" + i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface2)] transition-colors mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: EVENT_COLORS[ev.type] || "#888" }} />
              <span className="text-xs font-semibold text-[var(--text-main)] flex-1 truncate">{ev.company}</span>
              {ev.time && <span className="text-xs text-[var(--text-muted)] shrink-0">{ev.time}</span>}
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {ev.type === "interview" ? "面试" : ev.type === "offer_deadline" ? "Offer截止" : "截止"}
              </span>
            </Link>
          ))}

          {/* 自定义事件（可删除） */}
          {selectedCustomEvents.map(ev => (
            <div key={"c" + ev.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface2)] mb-1">
              <span className="w-1.5 h-1.5 rounded-full border shrink-0"
                style={{ borderColor: EVENT_COLORS[ev.type] || "#888" }} />
              <span className="text-xs font-semibold text-[var(--text-main)] flex-1 truncate">{ev.title}</span>
              {ev.time && <span className="text-xs text-[var(--text-muted)] shrink-0">{ev.time}</span>}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: (EVENT_COLORS[ev.type] || "#888") + "20", color: EVENT_COLORS[ev.type] || "#888" }}>
                {ev.type}
              </span>
              <button onClick={() => onDeleteCustomEvent(ev.id)}
                className="text-[var(--text-muted)] hover:text-red-500 text-xs transition-colors shrink-0">×</button>
            </div>
          ))}
        </div>
      )}

      {/* 时间线节点说明（未选中日期时显示） */}
      {!selectedDate && (timeline.start_date || timeline.target_date) && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-4 flex-wrap">
          {timeline.start_date && (
            <span className="text-xs text-[var(--text-muted)]">
              <span style={{ color: "#10b981" }}>◆</span> 开始 {timeline.start_date}
            </span>
          )}
          {timeline.target_date && (
            <span className="text-xs text-[var(--text-muted)]">
              <span style={{ color: "#ef4444" }}>◆</span> 目标 {timeline.target_date}
            </span>
          )}
        </div>
      )}

      {/* 空状态引导 */}
      {!selectedDate && events.length === 0 && customEvents.length === 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            点击任意日期可直接添加事件
          </p>
        </div>
      )}
    </div>
  )
}

// ===== 首页精简日历(参考 Elearn;点日期直接记日程,记事本式) =====
function HomeCalendar({ events, onAdd, onDelete }: {
  events: CustomCalendarEvent[]
  onAdd: (date: string, title: string) => void
  onDelete: (id: number) => void
}) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const [vy, setVy] = useState(today.getFullYear())
  const [vm, setVm] = useState(today.getMonth())
  // 默认选中今天 —— 点击每天的明细/添加功能默认展开
  const [sel, setSel] = useState<string>(todayStr)
  const [draft, setDraft] = useState("")
  const m1 = vm + 1
  const grid = buildGrid(vy, vm)
  const evMap: Record<string, CustomCalendarEvent[]> = {}
  events.forEach(e => { (evMap[e.date] = evMap[e.date] || []).push(e) })
  const prev = () => { if (vm === 0) { setVy(y => y - 1); setVm(11) } else setVm(m => m - 1) }
  const next = () => { if (vm === 11) { setVy(y => y + 1); setVm(0) } else setVm(m => m + 1) }
  const selEvents = evMap[sel] || []
  const submit = () => {
    const t = draft.trim()
    if (!t) return
    onAdd(sel, t)
    setDraft("")
  }

  return (
    <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <SheetCorners />
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[var(--text-main)]">{vy}年{m1}月</span>
        <div className="flex gap-1">
          <button onClick={prev} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface2)] text-[var(--text-muted)] text-sm">‹</button>
          <button onClick={next} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface2)] text-[var(--text-muted)] text-sm">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["一", "二", "三", "四", "五", "六", "日"].map(d => (
          <div key={d} className="text-xs text-center text-[var(--text-muted)] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = `${vy}-${String(m1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday = ds === todayStr
          const isSel = ds === sel
          const has = (evMap[ds] || []).length > 0
          return (
            <button key={i} onClick={() => setSel(ds)}
              className={`relative aspect-square flex items-center justify-center rounded-lg text-xs transition-colors ${
                isToday ? "bg-[var(--primary)] text-white font-semibold"
                : isSel ? "ring-1 ring-[var(--primary)] text-[var(--text-main)]"
                : has ? "font-bold text-[var(--primary)] hover:bg-[var(--surface2)]"
                : "text-[var(--text-main)] hover:bg-[var(--surface2)]"
              }`}>
              {day}
              {has && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-[var(--primary)]"}`} />}
            </button>
          )
        })}
      </div>
      {/* 当天明细 + 添加(默认展开;固定高度,事件多了内部滚动,不撑高卡片) */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col" style={{ height: 150 }}>
        <p className="text-xs text-[var(--text-muted)] mb-2 shrink-0">
          {sel}{sel === todayStr ? " · 今天" : ""}
        </p>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {selEvents.length > 0 ? selEvents.map(e => (
            <div key={e.id} className="group flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--primary)] shrink-0" />
              <span className="text-xs text-[var(--text-main)] flex-1 break-words leading-relaxed">{e.title}</span>
              <button onClick={() => onDelete(e.id)} title="删除"
                className="text-[var(--text-muted)] hover:text-[#B6634A] opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none shrink-0 mt-0.5">×</button>
            </div>
          )) : (
            <p className="text-xs text-[var(--text-muted)]/70">这天还没有安排,在下方写点什么</p>
          )}
        </div>
        <div className="flex gap-2 mt-2 shrink-0">
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="添加日程,如:字节一面 14:00"
            className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          <button onClick={submit} disabled={!draft.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0">添加</button>
        </div>
      </div>
    </div>
  )
}

// ===== 首页主组件 =====
export default function HomePage() {
  const profile = useProfile()
  const role = profile.target_role || "产品经理"

  const [allApps, setAllApps]           = useState<any[]>([])
  const [calendarEvents, setCalendar]   = useState<CalendarEvent[]>([])
  const [customEvents, setCustomEvents] = useState<CustomCalendarEvent[]>([])
  const [resumeVersions, setResumes]    = useState<ResumeVersion[]>([])
  const [practiceTotal, setPractice]    = useState(0)
  const [loaded, setLoaded]             = useState(false)
  const [showIntentPanel, setShowIntentPanel]           = useState(false)
  const [showTimelineSettings, setShowTimelineSettings] = useState(false)
  const [showAddEvent, setShowAddEvent]                 = useState(false)
  const [addEventDate, setAddEventDate]                 = useState("")
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("jobpilot_onboarding_v1_done") !== "1"
  })
  const [timeline, setTimeline]             = useState<Timeline>(loadTimeline)
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([])
  // 能力胶囊:左列「个人能力」(素材库聚合,缓存)、右列「所需能力」(最近一次JD分析)
  const [myTags, setMyTags]         = useState<MyTag[]>([])
  const [jdTags, setJdTags]         = useState<JdTag[]>([])
  const [matchMyTags, setMatchMyTags] = useState<MyTag[]>([])
  const [capLoading, setCapLoading] = useState(false)
  const [showAllMine, setShowAllMine] = useState(false)
  const [showAllJd, setShowAllJd]     = useState(false)

  // 首页视图模式(Phase 1 原型):chat=极简对话入口 / dashboard=现有完整视图
  const [homeView, setHomeView] = useState<"chat" | "dashboard">("dashboard")
  useEffect(() => {
    try { const v = localStorage.getItem("jobpilot_home_view"); if (v === "chat" || v === "dashboard") setHomeView(v) } catch {}
  }, [])
  const switchView = (v: "chat" | "dashboard") => {
    setHomeView(v)
    try { localStorage.setItem("jobpilot_home_view", v) } catch {}
  }
  const [chatMsgs, setChatMsgs]       = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput]     = useState("")
  const [chatSending, setChatSending] = useState(false)
  const sendChat = async (text?: string) => {
    const content = (text ?? chatInput).trim()
    if (!content || chatSending) return
    const next = [...chatMsgs, { role: "user", content }]
    setChatMsgs(next); setChatInput(""); setChatSending(true)
    try {
      const r = await api.ai.chat(next, "general")
      setChatMsgs([...next, { role: "assistant", content: r.content || "(无回复)" }])
    } catch {
      setChatMsgs([...next, { role: "assistant", content: "AI 暂时不可用，请稍后再试，或到「设置」检查 API Key。" }])
    } finally { setChatSending(false) }
  }

  const dismissGuide = () => {
    localStorage.setItem("jobpilot_onboarding_v1_done", "1")
    setShowGuide(false)
  }

  const openAddEvent = (date: string) => {
    setAddEventDate(date)
    setShowAddEvent(true)
  }

  const handleAddEvent = async (data: { date: string; title: string; type: string; time: string }) => {
    const created = await api.calendar.create(data)
    setCustomEvents(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
    setShowAddEvent(false)
  }

  const handleDeleteCustomEvent = async (id: number) => {
    await api.calendar.delete(id)
    setCustomEvents(prev => prev.filter(e => e.id !== id))
  }

  const saveTimeline = (tl: Timeline) => {
    localStorage.setItem("jobpilot_timeline", JSON.stringify(tl))
    setTimeline(tl)
    setShowTimelineSettings(false)
  }

  const dismissReminder = (key: string) => {
    localStorage.setItem(`jobpilot_notif_${key}`, "1")
    setActiveReminders(prev => prev.filter(r => r.key !== key))
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/applications`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/v1/practice/stats`).then(r => r.json()).catch(() => ({})),
      api.applications.getCalendar().catch(() => []),
      api.calendar.getAll().catch(() => []),
      api.resume.getVersions().catch(() => []),
    ]).then(([apps, practice, cal, custom, resumes]) => {
      setAllApps(Array.isArray(apps) ? apps : [])
      setPractice(practice?.total_practiced ?? 0)
      setCalendar(Array.isArray(cal) ? cal : [])
      setCustomEvents(Array.isArray(custom) ? custom : [])
      setResumes(Array.isArray(resumes) ? resumes : [])
      setLoaded(true)
    })
  }, [])

  // 能力胶囊数据加载
  useEffect(() => {
    // 左列:我的能力标签 —— 优先用缓存,无缓存才调一次 LLM(避免每次进首页都消耗)
    try {
      const cached = localStorage.getItem("jobpilot_my_tags")
      if (cached) {
        setMyTags(JSON.parse(cached))
      } else {
        setCapLoading(true)
        api.ai.myTags()
          .then(d => {
            const t = d.my_tags || []
            setMyTags(t)
            localStorage.setItem("jobpilot_my_tags", JSON.stringify(t))
          })
          .catch(() => {})
          .finally(() => setCapLoading(false))
      }
    } catch { /* ignore */ }
    // 右列:最近一次 JD 标签匹配(由简历工作台分析后写入 localStorage)
    try {
      const m = localStorage.getItem("jobpilot_last_tagmatch")
      if (m) {
        const d = JSON.parse(m)
        setJdTags(d.jd_tags || [])
        setMatchMyTags(d.my_tags || [])
      }
    } catch { /* ignore */ }
  }, [])

  // 手动刷新「个人能力」(重新聚合素材库)
  const refreshMyTags = () => {
    setCapLoading(true)
    api.ai.myTags()
      .then(d => {
        const t = d.my_tags || []
        setMyTags(t)
        localStorage.setItem("jobpilot_my_tags", JSON.stringify(t))
      })
      .catch(() => {})
      .finally(() => setCapLoading(false))
  }

  // 应用内提醒计算（数据加载后执行）
  // Phase 2: 接入账号体系后，在此处同步触发邮件通知 api.notifications.sendEmail()
  useEffect(() => {
    if (!loaded) return
    const today    = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const reminders: ActiveReminder[] = []

    // 1. 投递惰性提醒：7 天以上无新投递
    if (allApps.length > 0) {
      const lastDate = allApps.map(a => a.applied_date).filter(Boolean).sort().at(-1)
      if (lastDate) {
        const daysSince = Math.floor((today.getTime() - new Date(lastDate + "T00:00:00").getTime()) / 86400000)
        const key = `inactivity_${todayStr}`
        if (daysSince >= 7 && localStorage.getItem(`jobpilot_notif_${key}`) !== "1") {
          reminders.push({
            key, type: "inactivity", icon: "⏰",
            message: `你已 ${daysSince} 天未投递新简历`,
            subtext: "保持稳定的投递节奏有助于提升面试机会",
          })
        }
      }
    }

    // 2. 招聘季开启提醒：7 天内即将开始
    SEASONS.forEach(s => {
      const seasonStart = new Date(today.getFullYear(), s.start[0] - 1, s.start[1])
      const daysUntil   = Math.floor((seasonStart.getTime() - today.getTime()) / 86400000)
      if (daysUntil >= 0 && daysUntil <= 7) {
        const key = `season_${s.name}_${today.getFullYear()}`
        if (localStorage.getItem(`jobpilot_notif_${key}`) !== "1") {
          reminders.push({
            key, type: "season", icon: "📅",
            message: `${s.name}还有 ${daysUntil} 天开始`,
            subtext: `${s.start[0]}月${s.start[1]}日 — ${s.end[0]}月${s.end[1]}日，建议提前规划好投递节奏`,
          })
        }
      }
    })

    // 3. 目标落后提醒：已超目标日期且无 Offer
    const tl = loadTimeline()
    if (tl.target_date) {
      const target   = new Date(tl.target_date + "T00:00:00")
      const hasOffer = allApps.some(a => a.status === "Offer")
      const key      = `goal_${tl.target_date}`
      if (today > target && !hasOffer && localStorage.getItem(`jobpilot_notif_${key}`) !== "1") {
        reminders.push({
          key, type: "goal", icon: "🎯",
          message: `已超过目标日期（${tl.target_date}），尚未收到 Offer`,
          subtext: "可以在日历中更新目标时间，或调整求职策略",
        })
      }
    }

    // 4. 自定义截止事件预警：3 天内有「截止」类型事件
    customEvents
      .filter(e => e.type === "截止")
      .forEach(e => {
        const daysUntil = Math.floor((new Date(e.date + "T00:00:00").getTime() - today.getTime()) / 86400000)
        if (daysUntil >= 0 && daysUntil <= 3) {
          const key = `custom_deadline_${e.id}`
          if (localStorage.getItem(`jobpilot_notif_${key}`) !== "1") {
            reminders.push({
              key, type: "goal", icon: "⏰",
              message: `「${e.title}」还有 ${daysUntil === 0 ? "今天" : `${daysUntil} 天`}截止`,
            })
          }
        }
      })

    setActiveReminders(reminders)
  }, [loaded, allApps, customEvents, timeline])

  const todayLabel = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })
  const hasData    = allApps.length > 0
  const hasBaseResume = resumeVersions.length > 0 || myTags.length > 0
  const hasMyAbilityLayer = myTags.length > 0
  const hasJdRequirementLayer = jdTags.length > 0
  const hasMatchedVersion = resumeVersions.length > 0 && jdTags.length > 0

  // 求职小猫成长阶段
  const catStage = useMemo((): number => {
    if (!loaded) return 0
    const total = allApps.length
    if (allApps.some((a: any) => a.status === "Offer"))                              return 5
    if (allApps.some((a: any) => ["HR面","二面"].includes(a.status)))                return 4
    if (allApps.some((a: any) => ["一面","笔试"].includes(a.status)))                return 3
    if (total >= 15)                                                                  return 2
    if (total >= 1)                                                                   return 1
    return 0
  }, [loaded, allApps])

  // 最近一场即将到来的面试（14天内）
  const urgentApp = allApps
    .filter(a => a.interview_at && new Date(a.interview_at) > new Date())
    .sort((a: any, b: any) => new Date(a.interview_at).getTime() - new Date(b.interview_at).getTime())
    .at(0)
  const urgentDays = urgentApp
    ? Math.ceil((new Date(urgentApp.interview_at).getTime() - Date.now()) / 86400000)
    : null
  const showPriorityCard = urgentApp && urgentDays != null && urgentDays <= 14

  // 简历版本评分解析
  const tryParseScore = (json?: string): number | null => {
    if (!json) return null
    try { return JSON.parse(json)?.overall_score ?? null } catch { return null }
  }

  // ===== Phase 1 原型:极简对话首页 =====
  if (homeView === "chat") {
    const hasChat = chatMsgs.length > 0
    const latest = resumeVersions[0]
    const suggestions = [
      "把我的简历适配到某个目标岗位",
      "帮我拆解这段 JD 的能力要求",
      "转行做产品经理，简历该怎么写",
      "看看我的求职进度，下一步该做什么",
    ]
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 min-h-[82vh] flex flex-col" style={SHEET_GRID}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">Assistant</p>
            <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">求职助手</h1>
          </div>
          <button onClick={() => switchView("dashboard")}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 transition-colors">
            完整视图 →
          </button>
        </div>

        {!hasChat ? (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-center text-[var(--text-main)] font-cartoon mb-2">今天想做什么？</h2>
            <p className="text-center text-sm text-[var(--text-muted)] mb-7">告诉我你的目标岗位，或直接粘贴 JD，我帮你把简历改到位。</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {suggestions.map(s => (
                <button key={s} onClick={() => sendChat(s)}
                  className="text-xs text-[var(--text-sub)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 mb-4">
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]"
                }`}>{m.content}</div>
              </div>
            ))}
            {chatSending && <div className="text-xs text-[var(--text-muted)] px-1">正在思考…</div>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/resume" className="text-xs text-[var(--primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:bg-[var(--surface2)] transition-colors">去简历工作台 →</Link>
              <Link href="/jd-analysis" className="text-xs text-[var(--primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:bg-[var(--surface2)] transition-colors">拆解 JD →</Link>
              <Link href="/tracker" className="text-xs text-[var(--primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:bg-[var(--surface2)] transition-colors">投递看板 →</Link>
            </div>
          </div>
        )}

        <div className="sticky bottom-4 mt-2">
          <div className="flex items-end gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 shadow-sm">
            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              rows={1} placeholder="描述你的目标岗位，或粘贴 JD / 简历片段…"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] max-h-32" />
            <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatSending}
              className="shrink-0 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40">
              {chatSending ? "…" : "发送"}
            </button>
          </div>
          {(latest || activeReminders.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 px-1 text-xs text-[var(--text-muted)]">
              {latest && <Link href={`/resume?version_id=${latest.id}`} className="hover:text-[var(--primary)]">最近简历：{latest.version_name}</Link>}
              {activeReminders[0] && <span>· {activeReminders[0].message}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      <div className="flex justify-end mb-3">
        <button onClick={() => switchView("chat")}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 transition-colors">
          ✦ 极简对话模式 →
        </button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ===== 中栏:主内容(压缩) ===== */}
        <div className="flex-1 min-w-0">

      {/* ── 简历适配蓝图入口 ── */}
      <h2 className="text-xl font-bold text-[var(--text-main)] font-cartoon mb-2">简历适配蓝图</h2>
      <div className="mb-4 rounded-2xl overflow-hidden relative bg-[var(--hero)] text-white px-6 py-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* 淡描边概念标签(装饰,非进度条) */}
        <div className="pointer-events-none absolute right-5 top-5 hidden sm:grid grid-cols-2 gap-2 opacity-25">
          {["基础简历底图", "能力图层", "JD 约束层", "定制版本"].map(t => (
            <span key={t} className="rounded-xl border border-white/40 px-3 py-2 text-[10px] font-semibold text-white">{t}</span>
          ))}
        </div>
        <span className="pointer-events-none absolute right-4 bottom-3 font-mono text-[10px] tracking-[0.2em] text-white/40">R-01</span>
        <div className="relative max-w-md">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Resume Adaptation Blueprint</p>
          <p className="text-base text-white/90 leading-relaxed mb-5">
            把一份基础简历当作底图，叠上你的能力与目标 JD 的要求，生成这一岗位该强调、该补齐、该重写的版本。
          </p>
          <Link href="/resume"
            className="inline-flex items-center gap-1 bg-[var(--accent)] text-[var(--hero)] px-4 py-2 rounded-lg text-xs font-semibold hover:brightness-95 transition-all">
            {hasJdRequirementLayer ? "继续匹配修改" : hasBaseResume ? "导入目标 JD" : "建立基础简历底图"} →
          </Link>
        </div>
      </div>

      {/* ── 能力胶囊:个人能力 × 所需能力(参考列表卡片样式,每标签独占一行) ── */}
      {loaded && (() => {
        const matHref = (mats?: { type: string; id: number }[]) =>
          mats && mats.length ? `/profile?focus=${mats[0].type}-${mats[0].id}` : "/profile"
        const sortedMine = [...myTags].sort(
          (a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain)
        )
        const statusRank: Record<string, number> = { 缺口: 0, 部分: 1, 命中: 2 }
        const sortedJd = [...jdTags].sort(
          (a, b) => (statusRank[a.status] - statusRank[b.status]) ||
            (DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain))
        )
        const LIMIT = 3
        const mineShown = showAllMine ? sortedMine : sortedMine.slice(0, LIMIT)
        const jdShown   = showAllJd   ? sortedJd   : sortedJd.slice(0, LIMIT)
        const jdMat = (t: JdTag) => matHref(matchMyTags.find(m => m.id === t.id)?.materials)

        // 单行卡片(图层/约束符号 + 标题/副标题 + 右侧状态)
        const Row = ({ href, icon, iconBg, tone, title, subtitle, pill, pillCls }: {
          href: string; icon: string; iconBg: string; tone: SketchTone
          title: string; subtitle: string; pill: string; pillCls: string
        }) => (
          <Link href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface2)] transition-colors">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`} title={icon}><LayerBadgeIcon tone={tone} label={icon} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-main)] truncate">{title}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 ${pillCls}`}>{pill}</span>
          </Link>
        )

        return (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <SheetCode>R-02 / LAYERS</SheetCode>
                <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">能力图层 × JD 约束</h3>
              </div>
              <Link href="/resume" className="text-xs text-[var(--primary)] hover:underline">进入匹配修改 →</Link>
            </div>
            <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 lg:h-[260px] flex flex-col overflow-hidden">
              <div className="pointer-events-none absolute inset-0" style={SHEET_GRID} />
              <SheetCorners />
              <div className="relative grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-[var(--border)] flex-1 min-h-0 overflow-y-auto">
                {/* 左:个人能力 */}
                <div className="sm:pr-4">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <p className="text-xs font-semibold text-[var(--text-sub)]">
                      基础简历能力图层 <span className="text-[var(--text-muted)] font-normal">· 来自素材库</span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {sortedMine.length > LIMIT && (
                        <button onClick={() => setShowAllMine(v => !v)}
                          className="text-[10px] text-[var(--primary)] hover:underline">
                          {showAllMine ? "收起" : `view all ${sortedMine.length}`}
                        </button>
                      )}
                      <button onClick={refreshMyTags} disabled={capLoading}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-50"
                        title="重新聚合素材库">{capLoading ? "聚合中…" : "刷新"}</button>
                    </div>
                  </div>
                  {sortedMine.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] px-1 py-2">
                      {capLoading ? "正在从素材库聚合你的能力标签…" : (
                        <>素材库还没有内容,<Link href="/profile" className="text-[var(--primary)] hover:underline">去添加经历 →</Link></>
                      )}
                    </p>
                  ) : (
                    <>
                      {mineShown.map(t => {
                        const st = DOMAIN_STYLE[t.domain]
                        const tone = t.domain === "domain" ? "ochre" : t.domain === "soft" ? "muted" : "green"
                        const sub = t.materials.length
                          ? `${st.name}${t.strength === "弱" ? " · 待强化" : ""} · ${t.materials.length} 段经历`
                          : `${st.name} · 通用素养`
                        return (
                          <Row key={t.id} href={matHref(t.materials)} icon={t.label[0]} iconBg={st.icon}
                            tone={tone} title={t.label} subtitle={sub} pill="查看经历" pillCls={st.pill} />
                        )
                      })}
                    </>
                  )}
                </div>
                {/* 右:所需能力 */}
                <div className="sm:pl-4 mt-4 pt-4 sm:mt-0 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <p className="text-xs font-semibold text-[var(--text-sub)]">
                      目标 JD 约束图层 <span className="text-[var(--text-muted)] font-normal">· 最近分析的 JD</span>
                    </p>
                    {sortedJd.length > LIMIT && (
                      <button onClick={() => setShowAllJd(v => !v)}
                        className="text-[10px] text-[var(--primary)] hover:underline shrink-0">
                        {showAllJd ? "收起" : `view all ${sortedJd.length}`}
                      </button>
                    )}
                  </div>
                  {sortedJd.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] px-1 py-2">
                      还没有分析过 JD。<Link href="/resume" className="text-[var(--primary)] hover:underline">去适配第一份 JD →</Link>
                    </p>
                  ) : (
                    <>
                      {jdShown.map(t => {
                        const st = STATUS_STYLE[t.status]
                        const tone: SketchTone = t.status === "缺口" ? "terra" : t.status === "部分" ? "ochre" : "green"
                        return (
                          <Row key={t.id} href={jdMat(t)} icon={t.label[0]} iconBg={st.icon}
                            title={t.label} subtitle={`${t.priority} · ${DOMAIN_STYLE[t.domain].name}`}
                            tone={tone} pill={st.label} pillCls={st.pill} />
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 面试提醒（下方）── */}
      {loaded && showPriorityCard && (
        <div className="mb-4 flex items-center gap-4 px-5 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
            style={{ background: urgentDays! <= 1 ? "#B6634A" : urgentDays! <= 3 ? "#C0954E" : "#2E5B54" }} />
          <div className="pl-3 flex-1 min-w-0">
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-0.5">面试提醒</p>
            <p className="text-sm font-semibold text-[var(--text-main)] truncate">{urgentApp.company} · {urgentApp.position}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {urgentDays === 0 ? "今天面试" : urgentDays === 1 ? "明天面试" : `${urgentDays} 天后面试`}
              <span className="ml-1.5">{urgentApp.status}</span>
            </p>
          </div>
          <Link href="/tracker" className="shrink-0 px-4 py-2 bg-[var(--text-main)] text-white text-xs font-semibold rounded-xl hover:opacity-85 transition-opacity">
            查看详情
          </Link>
        </div>
      )}

      {/* ── 历史简历 + 提醒(同一行)── */}
      {loaded && (
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <SheetCode>R-03 / VERSIONS</SheetCode>
              <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">历史简历版本</h3>
            </div>
            <Link href="/resume" className="text-xs text-[var(--primary)] hover:underline">全部 →</Link>
          </div>
          {resumeVersions.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {resumeVersions.map(v => {
                const score = tryParseScore(v.analysis_json)
                // 分数三档:0-60 / 60-80 / 80+,每档不同图画(先占位 emoji,后续替换为图片)
                const tier = score == null ? "none" : score >= 80 ? "high" : score >= 60 ? "mid" : "low"
                const cfg = {
                  high: { bg: "bg-[#E3EDE3]", bar: "#4F8063", text: "text-[#3C6B4E]" },
                  mid:  { bg: "bg-[#F2E9D6]", bar: "#C0954E", text: "text-[#876426]" },
                  low:  { bg: "bg-[#F1E0DA]", bar: "#B6634A", text: "text-[#9E4631]" },
                  none: { bg: "bg-[var(--surface2)]", bar: "#9ca3af", text: "text-[var(--text-muted)]" },
                }[tier]
                return (
                  <Link href={`/resume?version_id=${v.id}`} key={v.id}
                    className="w-40 shrink-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--text-main)]/20 transition-colors">
                    {/* 上部图画区:按分数档显示(规划图式小插画) */}
                    <div className={`h-20 flex items-center justify-center ${cfg.bg}`}>
                      <VersionSketch tier={tier} />
                    </div>
                    <div className="p-3">
                      {/* 分数进度条 */}
                      {score != null ? (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, background: cfg.bar }} />
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${cfg.text}`}>{score}</span>
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-[var(--text-muted)] mb-2">未评分</span>
                      )}
                      <p className="text-xs font-semibold text-[var(--text-main)] leading-snug line-clamp-2">{v.version_name}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex gap-3">
              {[0, 1].map(i => (
                <Link href="/resume" key={i}
                  className="w-40 shrink-0 flex flex-col items-center justify-center gap-2 h-28 bg-[var(--surface2)] border border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary)]/40 transition-colors">
                  <PlanPersonIcon tone="muted" />
                  <span className="text-xs text-[var(--text-muted)]">{i === 0 ? "还没有简历版本" : "去生成第一份 →"}</span>
                </Link>
              ))}
            </div>
          )}
          </div>{/* 历史简历 cell 结束 */}

          {/* 提醒(与历史简历同一行) */}
          {activeReminders.length > 0 && (
            <div className="lg:w-72 shrink-0">
              <div className="flex items-baseline gap-2 mb-3">
                <SheetCode>R-05 / ALERTS</SheetCode>
                <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">提醒</h3>
              </div>
              <div className="space-y-2">
                {activeReminders.map(r => (
                  <div key={r.key} className="flex items-start gap-3 px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl">
                    <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)]">{r.message}</p>
                      {r.subtext && <p className="text-xs text-[var(--text-muted)] mt-0.5">{r.subtext}</p>}
                      {r.type === "inactivity" && <Link href="/tracker" className="text-xs text-[var(--primary)] hover:underline font-semibold mt-1 inline-block">去投递看板 →</Link>}
                      {r.type === "season" && <button onClick={() => setShowTimelineSettings(true)} className="text-xs text-[var(--primary)] hover:underline font-semibold mt-1">设置时间线 →</button>}
                    </div>
                    <button onClick={() => dismissReminder(r.key)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-base leading-none shrink-0">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        </div>{/* ===== 中栏结束 ===== */}

        {/* ===== 右栏:日历系统(贯穿整个右侧) ===== */}
        <aside className="lg:w-80 shrink-0 flex flex-col gap-4">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <SheetCode>R-04 / CALENDAR</SheetCode>
              <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">求职日历</h3>
            </div>
            <HomeCalendar events={customEvents} onAdd={(date, title) => handleAddEvent({ date, title, type: "日程", time: "" })} onDelete={handleDeleteCustomEvent} />
          </div>
        </aside>
      </div>{/* ===== flex 结束 ===== */}

      {/* ── Modals ── */}
      {showIntentPanel      && <IntentTagPanel onClose={() => setShowIntentPanel(false)} />}
      {showGuide             && <OnboardingGuideModal onClose={dismissGuide} />}
      {showTimelineSettings  && <TimelineSettingsModal timeline={timeline} onSave={saveTimeline} onClose={() => setShowTimelineSettings(false)} />}
      {showAddEvent          && <AddEventModal defaultDate={addEventDate} onSave={handleAddEvent} onClose={() => setShowAddEvent(false)} />}
    </div>
  )
}
