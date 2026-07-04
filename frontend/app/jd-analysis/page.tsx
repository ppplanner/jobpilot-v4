"use client"

import { useState, useEffect } from "react"
import { SHEET_GRID } from "@/components/blueprint"

const API = ""

interface MatchItem {
  aspect: string
  jd_requirement: string
  resume_status: "strong" | "weak" | "missing"
  suggestion: string
}

interface AnalysisResult {
  overall_score: number
  summary: string
  match_items: MatchItem[]
  must_add: string[]
  highlight: string[]
  raw?: string
}

export default function JdAnalysisPage() {
  const [resumeText, setResumeText] = useState("")
  const [jdText, setJdText] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fromResumePage, setFromResumePage] = useState(false)

  useEffect(() => {
    const r = sessionStorage.getItem("jd_analysis_resume")
    const j = sessionStorage.getItem("jd_analysis_jd")
    const c = sessionStorage.getItem("jd_analysis_company")
    const p = sessionStorage.getItem("jd_analysis_position")
    if (r || j) {
      setResumeText(r || "")
      setJdText(j || "")
      setCompany(c || "")
      setPosition(p || "")
      setFromResumePage(true)
    }
  }, [])

  const analyze = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      setError("请填写简历内容和 JD 内容")
      return
    }
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const resp = await fetch(`${API}/api/v1/ai/jd-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, company, position }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || "分析失败")
      setResult(data)
    } catch (e: any) {
      setError(e.message || "分析失败，请检查 API 配置")
    } finally {
      setLoading(false)
    }
  }

  const STATUS_CONFIG = {
    strong:  { label: "匹配", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500" },
    weak:    { label: "较弱", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500" },
    missing: { label: "缺失", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500"   },
  }

  const scoreColor = (score: number) =>
    score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600"

  const inputCls = "w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      <div className="mb-6">
        {fromResumePage && (
          <a href="/resume" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-sub)] flex items-center gap-1 mb-2">
            ← 返回简历工作台
          </a>
        )}
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">JD Match Analysis</p>
        <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">JD 匹配分析</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">对比简历与岗位 JD，定位差距和修改方向</p>
      </div>

      {/* 输入区域 */}
      {!result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">公司名称</label>
              <input value={company} onChange={e => setCompany(e.target.value)}
                placeholder="如：字节跳动" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">岗位名称</label>
              <input value={position} onChange={e => setPosition(e.target.value)}
                placeholder="如：B端产品经理" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">简历内容</label>
              <textarea rows={10} value={resumeText} onChange={e => setResumeText(e.target.value)}
                placeholder="粘贴你的简历全文..." className={inputCls + " resize-none"} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">岗位 JD</label>
              <textarea rows={10} value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="粘贴目标岗位的 JD 全文..." className={inputCls + " resize-none"} />
            </div>
          </div>

          {error && <div className="text-sm text-[#9E4631] bg-[#F1E0DA] rounded-lg px-3 py-2">{error}</div>}

          <div className="flex justify-end">
            <button onClick={analyze} disabled={loading}
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  分析中...
                </>
              ) : "开始分析"}
            </button>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setResult(null)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-sub)] flex items-center gap-1">
              ← 重新分析
            </button>
            <a href="/resume"
              className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity">
              去简历工作台改写 →
            </a>
          </div>

          {result.raw ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">分析结果</p>
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-main)] leading-relaxed">{result.raw}</pre>
            </div>
          ) : (
            <>
              {/* 总体评分 */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3EFE8" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none"
                        stroke={result.overall_score >= 75 ? "#4F8063" : result.overall_score >= 50 ? "#C0954E" : "#B6634A"}
                        strokeWidth="3" strokeDasharray={`${result.overall_score} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xl font-bold ${scoreColor(result.overall_score)}`}>{result.overall_score}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-base font-bold text-[var(--text-main)]">
                        {company || "目标公司"}{position ? ` · ${position}` : ""}
                      </h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        result.overall_score >= 75 ? "bg-[#E3EDE3] text-[#3C6B4E]" :
                        result.overall_score >= 50 ? "bg-[#F2E9D6] text-[#876426]" :
                        "bg-[#F1E0DA] text-[#9E4631]"
                      }`}>
                        {result.overall_score >= 75 ? "强匹配" : result.overall_score >= 50 ? "中等匹配" : "差距较大"}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-sub)] leading-relaxed">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* 逐项匹配 */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-[var(--surface2)] border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">逐项匹配分析</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">绿色=已匹配 · 橙色=需强化 · 红色=缺失</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {result.match_items.map((item, i) => {
                    const cfg = STATUS_CONFIG[item.resume_status]
                    return (
                      <div key={i} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-semibold text-[var(--text-main)]">{item.aspect}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-1.5">JD 要求：{item.jd_requirement}</p>
                            {item.resume_status !== "strong" && (
                              <div className={`rounded-lg px-3 py-2 text-xs ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                建议：{item.suggestion}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 必须补充 + 可以突出 */}
              <div className="grid grid-cols-2 gap-4">
                {result.must_add.length > 0 && (
                  <div className="bg-[var(--surface)] border border-red-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">必须补充</h4>
                    <ul className="space-y-2">
                      {result.must_add.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                          <span className="text-red-500 shrink-0 mt-0.5 font-bold">!</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.highlight.length > 0 && (
                  <div className="bg-[var(--surface)] border border-green-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">可以重点突出</h4>
                    <ul className="space-y-2">
                      {result.highlight.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                          <span className="text-green-500 shrink-0 mt-0.5">★</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 底部行动按钮 */}
              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-main)] mb-0.5">分析完成，开始改写简历</p>
                  <p className="text-xs text-[var(--text-muted)]">根据以上分析结果，去简历工作台针对性改写</p>
                </div>
                <a href="/resume"
                  onClick={() => {
                    sessionStorage.setItem("jd_analysis_resume", resumeText)
                    sessionStorage.setItem("jd_analysis_jd", jdText)
                    sessionStorage.setItem("jd_analysis_company", company)
                    sessionStorage.setItem("jd_analysis_position", position)
                  }}
                  className="shrink-0 px-5 py-2.5 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity">
                  去改写简历 →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
