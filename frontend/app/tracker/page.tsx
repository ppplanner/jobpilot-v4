"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { api, Application, Debrief, PersonalQuestion, ResumeVersion } from "@/lib/api"
import { SHEET_GRID, SheetCard, SheetHeading } from "@/components/blueprint"

// 状态色改为大地色系(与首页/蓝图皮肤统一),保留进程递进的语义
const STATUS_COLORS: Record<string, string> = {
  "已投递": "#5B7E86",  // 灰蓝绿·起点
  "笔试":   "#9C8B70",  // 驼
  "一面":   "#C0954E",  // 赭黄
  "二面":   "#B07A52",  // 陶土
  "HR面":   "#5E7E52",  // 橄榄
  "Offer":  "#4F8063",  // 苔绿·成功
  "挂":     "#A8A79C",  // 弱灰
  "放弃":   "#A8A79C",
}

const TIER_COLORS: Record<string, string> = {
  "冲刺": "#B6634A",  // 陶土红
  "匹配": "#C0954E",  // 赭黄
  "保底": "#4F8063",  // 苔绿
}

const STATUSES = ["已投递", "笔试", "一面", "二面", "HR面", "Offer", "挂", "放弃"]
const TIERS    = ["冲刺", "匹配", "保底"]
const SOURCES  = ["官网/APP", "内推", "Boss直聘", "拉勾", "猎聘", "牛客", "其他"]
const ROUNDS   = ["笔试", "一面", "二面", "HR面", "综合面"]

// ===== 星级评分组件 =====
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= value ? "text-amber-400" : "text-[var(--border)]"}`}>
          ★
        </button>
      ))}
    </div>
  )
}

// ===== 复盘详情卡 =====
function DebriefCard({ debrief, app, onDelete }: {
  debrief: Debrief
  app: Application
  onDelete: () => void
}) {
  const [added, setAdded] = useState<Record<number, boolean>>({})
  const questions = debrief.questions
    ? debrief.questions.split("\n").map(q => q.trim()).filter(Boolean)
    : []

  const addToList = async (q: string, idx: number) => {
    try {
      await api.practice.addPersonal({
        question: q,
        source_company: app.company,
        source_position: app.position,
        source_round: debrief.round,
        application_id: app.id,
      })
      setAdded(prev => ({ ...prev, [idx]: true }))
    } catch {}
  }

  return (
    <div className="bg-[var(--surface2)] rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            {debrief.round}
          </span>
          {debrief.interview_date && (
            <span className="text-xs text-[var(--text-muted)]">{debrief.interview_date}</span>
          )}
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`text-sm ${n <= debrief.self_score ? "text-amber-400" : "text-[var(--border)]"}`}>★</span>
            ))}
          </div>
        </div>
        <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-red-500 text-xs transition-colors">
          删除
        </button>
      </div>

      {questions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">被问到的题</p>
          <div className="space-y-1.5">
            {questions.map((q, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2">
                <p className="text-xs text-[var(--text-sub)] flex-1 leading-relaxed">{q}</p>
                <button
                  onClick={() => addToList(q, idx)}
                  disabled={added[idx]}
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                    added[idx]
                      ? "bg-green-100 text-green-700"
                      : "bg-[var(--primary-bg)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                  }`}
                >
                  {added[idx] ? "已加入 ✓" : "+ 练习"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {debrief.went_wrong && (
        <div>
          <p className="text-xs font-medium text-red-500 mb-1">没答好的地方</p>
          <p className="text-xs text-[var(--text-sub)] whitespace-pre-wrap leading-relaxed">{debrief.went_wrong}</p>
        </div>
      )}

      {debrief.interviewer_fb && (
        <div>
          <p className="text-xs font-medium text-emerald-600 mb-1">面试官反馈</p>
          <p className="text-xs text-[var(--text-sub)] whitespace-pre-wrap leading-relaxed">{debrief.interviewer_fb}</p>
        </div>
      )}
    </div>
  )
}

// ===== 侧滑抽屉 =====
function AppDrawer({ app, onClose, onStatusChange }: {
  app: Application
  onClose: () => void
  onStatusChange: (id: number, status: string) => void
}) {
  const [debriefs, setDebriefs] = useState<Debrief[]>([])
  const [linkedVersions, setLinkedVersions] = useState<ResumeVersion[]>([])
  const [otherVersions, setOtherVersions] = useState<ResumeVersion[]>([])
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)
  const [showOtherVersions, setShowOtherVersions] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    round: "一面", interview_date: new Date().toISOString().slice(0, 10),
    questions: "", self_score: 3, went_wrong: "", interviewer_fb: "",
  })

  useEffect(() => {
    api.applications.getDebriefs(app.id).then(setDebriefs).catch(() => {})
    // 先拿绑定此投递的专属版本，再拿全部版本（过滤出其他版本）
    Promise.all([
      api.resume.getVersions(app.id).catch(() => [] as ResumeVersion[]),
      api.resume.getVersions().catch(() => [] as ResumeVersion[]),
    ]).then(([linked, all]) => {
      setLinkedVersions(linked)
      const linkedIds = new Set(linked.map((v: ResumeVersion) => v.id))
      setOtherVersions(all.filter((v: ResumeVersion) => !linkedIds.has(v.id)))
    })
  }, [app.id])

  const tryParseAnalysis = (json?: string): any => {
    if (!json) return null
    try { return JSON.parse(json) } catch { return null }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.applications.createDebrief(app.id, form)
      setDebriefs(prev => [created, ...prev])
      setShowForm(false)
      setForm({ round: "一面", interview_date: new Date().toISOString().slice(0, 10),
                questions: "", self_score: 3, went_wrong: "", interviewer_fb: "" })
    } catch (e: any) {
      alert("保存失败: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDebrief = async (debriefId: number) => {
    if (!confirm("确认删除这条复盘？")) return
    await api.applications.deleteDebrief(app.id, debriefId)
    setDebriefs(prev => prev.filter(d => d.id !== debriefId))
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* 抽屉主体 */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--surface)] shadow-2xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[var(--text-main)]">{app.company}</span>
              <span className="text-sm text-[var(--text-sub)]">{app.position}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: (STATUS_COLORS[app.status] || "#94a3b8") + "20", color: STATUS_COLORS[app.status] || "#94a3b8" }}>
                {app.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: (TIER_COLORS[app.tier] || "#94a3b8") + "20", color: TIER_COLORS[app.tier] || "#94a3b8" }}>
                {app.tier}
              </span>
              {app.jd_score != null && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  app.jd_score >= 75 ? "bg-green-50 text-green-700" :
                  app.jd_score >= 50 ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-600"
                }`}>
                  JD匹配 {app.jd_score}分
                </span>
              )}
              {app.applied_date && <span className="text-xs text-[var(--text-muted)]">{app.applied_date}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0 text-xl leading-none">
            ×
          </button>
        </div>

        {/* 内容区（可滚动） */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* 投递元信息 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {[
              { label: "更新状态", value: (
                <select value={app.status} onChange={e => onStatusChange(app.id, e.target.value)}
                  className="text-xs border border-[var(--border)] rounded px-1.5 py-0.5 bg-[var(--surface2)] text-[var(--text-main)] focus:outline-none">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              )},
              app.jd_url && { label: "JD链接", value: <a href={app.jd_url} target="_blank" rel="noopener" className="text-[var(--primary)] hover:underline truncate block">查看JD</a> },
            ].filter(Boolean).map((item: any, i) => (
              <div key={i}>
                <span className="text-[var(--text-muted)] block mb-0.5">{item.label}</span>
                <span className="text-[var(--text-sub)] font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          {app.notes && (
            <div className="bg-[var(--surface2)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-sub)] leading-relaxed">
              {app.notes}
            </div>
          )}

          {/* 简历版本历史 */}
          {(linkedVersions.length > 0 || otherVersions.length > 0) && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">简历版本</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* 本次投递专属版本 */}
              {linkedVersions.length > 0 ? (
                <div className="space-y-2 mb-2">
                  {linkedVersions.map(v => {
                    const analysis = tryParseAnalysis(v.analysis_json)
                    const score = analysis?.overall_score ?? null
                    const isExpanded = expandedVersion === v.id
                    return (
                      <div key={v.id} className="bg-[var(--surface2)] rounded-xl overflow-hidden border border-[var(--primary)]/20">
                        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--primary)]/5 transition-colors"
                          onClick={() => setExpandedVersion(isExpanded ? null : v.id)}>
                          {score != null && (
                            <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                              score >= 70 ? "bg-emerald-50 text-emerald-700" :
                              score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                            }`}>{score}分</span>
                          )}
                          <span className="text-xs font-medium text-[var(--text-main)] flex-1 truncate">{v.version_name}</span>
                          <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded-full font-medium shrink-0">专属</span>
                          <span className="text-[var(--text-muted)] text-xs shrink-0">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && analysis && (
                          <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)]">
                            {analysis.summary && (
                              <p className="text-xs text-[var(--text-sub)] leading-relaxed pt-2">{analysis.summary}</p>
                            )}
                            {analysis.match_items?.length > 0 && (
                              <div className="space-y-1">
                                {analysis.match_items.slice(0, 4).map((item: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded font-medium ${
                                      item.resume_status === "strong" ? "bg-emerald-50 text-emerald-700" :
                                      item.resume_status === "weak"   ? "bg-amber-50 text-amber-700" :
                                      "bg-red-50 text-red-600"
                                    }`}>
                                      {item.resume_status === "strong" ? "✓" : item.resume_status === "weak" ? "△" : "✗"}
                                    </span>
                                    <span className="text-xs text-[var(--text-sub)]">{item.aspect}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {analysis.must_add?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-red-500 mb-1">建议补充</p>
                                {analysis.must_add.slice(0, 2).map((s: string, i: number) => (
                                  <p key={i} className="text-[10px] text-[var(--text-muted)]">· {s}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mb-2">还没有针对此投递的专属简历版本</p>
              )}

              {/* 其他版本（可折叠） */}
              {otherVersions.length > 0 && (
                <div className="mb-2">
                  <button onClick={() => setShowOtherVersions(v => !v)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-sub)] transition-colors">
                    {showOtherVersions ? "▲ 收起其他版本" : `▼ 查看其他 ${otherVersions.length} 个版本`}
                  </button>
                  {showOtherVersions && (
                    <div className="space-y-1.5 mt-2">
                      {otherVersions.slice(0, 5).map(v => {
                        const analysis = tryParseAnalysis(v.analysis_json)
                        const score = analysis?.overall_score ?? null
                        const isExpanded = expandedVersion === v.id
                        return (
                          <div key={v.id} className="bg-[var(--surface2)] rounded-xl overflow-hidden">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--border)]/30 transition-colors"
                              onClick={() => setExpandedVersion(isExpanded ? null : v.id)}>
                              {score != null && (
                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  score >= 70 ? "bg-emerald-50 text-emerald-700" :
                                  score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                                }`}>{score}分</span>
                              )}
                              <span className="text-xs text-[var(--text-main)] flex-1 truncate">{v.version_name}</span>
                              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                                {new Date(v.created_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                              </span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 针对此投递优化简历 */}
              <Link
                href={`/resume?company=${encodeURIComponent(app.company)}&position=${encodeURIComponent(app.position)}&app_id=${app.id}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-[var(--primary)]/40 text-xs text-[var(--primary)] rounded-xl hover:bg-[var(--primary)]/5 transition-colors font-medium">
                针对此投递优化简历 →
              </Link>
            </div>
          )}

          {/* 简历入口（无任何版本时也显示） */}
          {linkedVersions.length === 0 && otherVersions.length === 0 && (
            <Link
              href={`/resume?company=${encodeURIComponent(app.company)}&position=${encodeURIComponent(app.position)}&app_id=${app.id}`}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] rounded-xl hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors">
              针对此投递优化简历 →
            </Link>
          )}

          {/* 分割线 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">面试复盘</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* 复盘列表 */}
          {debriefs.length === 0 && !showForm && (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">还没有复盘记录，面试后记得填写</p>
          )}
          <div className="space-y-3">
            {debriefs.map(d => (
              <DebriefCard key={d.id} debrief={d} app={app} onDelete={() => handleDeleteDebrief(d.id)} />
            ))}
          </div>

          {/* 添加复盘表单 */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">填写面试复盘</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">面试轮次</label>
                  <select value={form.round} onChange={e => setForm({...form, round: e.target.value})}
                    className={inputCls}>
                    {ROUNDS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">面试日期</label>
                  <input type="date" value={form.interview_date}
                    onChange={e => setForm({...form, interview_date: e.target.value})}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">自我评分</label>
                <StarRating value={form.self_score} onChange={v => setForm({...form, self_score: v})} />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">被问到的题（每行一题）</label>
                <textarea rows={3} value={form.questions}
                  onChange={e => setForm({...form, questions: e.target.value})}
                  placeholder={"如何设计一个xx功能？\n数据指标下降如何排查？"}
                  className={inputCls + " resize-none"} />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">没答好的地方</label>
                <textarea rows={2} value={form.went_wrong}
                  onChange={e => setForm({...form, went_wrong: e.target.value})}
                  placeholder="哪个问题没有回答好，下次如何改进..."
                  className={inputCls + " resize-none"} />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">面试官反馈 / 信号</label>
                <textarea rows={2} value={form.interviewer_fb}
                  onChange={e => setForm({...form, interviewer_fb: e.target.value})}
                  placeholder="面试官态度、追问方向、给出的信号..."
                  className={inputCls + " resize-none"} />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                  {saving ? "保存中..." : "保存复盘"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[var(--border)] text-sm text-[var(--text-sub)] rounded-lg hover:bg-[var(--surface2)] transition-colors">
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full py-2.5 border-2 border-dashed border-amber-300 text-amber-600 text-sm rounded-xl hover:bg-amber-50 transition-colors font-medium">
              + 添加面试复盘
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ===== 主页面 =====
export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [filterStatus, setFilterStatus] = useState("全部")
  const [filterTier, setFilterTier] = useState("全部")
  const [search, setSearch] = useState("")

  const [newApp, setNewApp] = useState({
    company: "", position: "", tier: "匹配",
    status: "已投递", applied_date: new Date().toISOString().slice(0, 10),
    notes: "", jd_url: "", interview_at: "", deadline: "",
  })

  useEffect(() => { loadApps() }, [])

  const loadApps = async () => {
    try {
      const data = await api.applications.getAll()
      setApps(data)
    } catch (e) {
      console.error("加载失败:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newApp.company || !newApp.position) return
    try {
      await api.applications.create(newApp as any)
      setShowAddForm(false)
      setNewApp({ company: "", position: "", tier: "匹配", status: "已投递",
                  applied_date: new Date().toISOString().slice(0, 10),
                  notes: "", jd_url: "", interview_at: "", deadline: "" })
      loadApps()
    } catch (e: any) {
      alert("添加失败: " + e.message)
    }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.applications.update(id, { status })
      setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      if (selectedApp?.id === id) setSelectedApp(prev => prev ? { ...prev, status } : null)
    } catch (e: any) {
      console.error("更新失败:", e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除这条投递记录？")) return
    try {
      await api.applications.delete(id)
      setApps(prev => prev.filter(a => a.id !== id))
      if (selectedApp?.id === id) setSelectedApp(null)
    } catch (e: any) {
      alert("删除失败: " + e.message)
    }
  }

  const filtered = apps.filter(a => {
    if (filterStatus !== "全部" && a.status !== filterStatus) return false
    if (filterTier   !== "全部" && a.tier   !== filterTier)   return false
    if (search && !a.company.includes(search) && !a.position.includes(search)) return false
    return true
  })

  const stats = {
    total:        apps.length,
    active:       apps.filter(a => !["挂","放弃"].includes(a.status)).length,
    interviewing: apps.filter(a => ["一面","二面","HR面"].includes(a.status)).length,
    offers:       apps.filter(a => a.status === "Offer").length,
  }
  // 漏斗各阶段数量 + 转化率(进面及以上=面试中+Offer,近似"曾进入面试")
  const written          = apps.filter(a => a.status === "笔试").length
  const reachedInterview = stats.interviewing + stats.offers
  const convToInterview  = stats.total > 0 ? Math.round((reachedInterview / stats.total) * 100) : 0
  const convToOffer      = reachedInterview > 0 ? Math.round((stats.offers / reachedInterview) * 100) : 0

  // 数据驱动的智能建议
  type Advice = { key: string; tone: "warn" | "info"; icon: string; title: string; desc: string; href: string; cta: string }
  const advices: Advice[] = []
  if (stats.total >= 8 && convToInterview < 20) {
    advices.push({
      key: "resume", tone: "warn", icon: "✎",
      title: "投得不少，但进面率偏低",
      desc: `已投 ${stats.total} 家，仅 ${convToInterview}% 进入面试。简历可能没能对上岗位关键词，建议回工作台针对性改写后再投。`,
      href: "/resume", cta: "去优化简历 →",
    })
  }
  if (reachedInterview >= 3) {
    advices.push({
      key: "interview", tone: "info", icon: "◇",
      title: `已有 ${reachedInterview} 次进面，抓好准备与复盘`,
      desc: convToOffer < 40
        ? `面试→Offer 转化 ${convToOffer}%，还有提升空间。面前刷题演练，面后点开投递记录填写复盘，把被问到的问题沉淀下来。`
        : `保持节奏：面前刷题演练，面后点开投递记录填写复盘，把经验沉淀下来。`,
      href: "/practice", cta: "去刷题准备 →",
    })
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface2)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">Application Tracker</p>
          <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">投递看板</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">点击任意记录查看详情和填写面试复盘</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="shrink-0 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          + 新增投递
        </button>
      </div>

      {/* 漏斗统计图:左=各阶段数量,右=转化率 */}
      <div className="mb-4">
        <SheetHeading code="T-01 / FUNNEL" title="投递漏斗" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 数量图(各阶段条形) */}
          <SheetCard>
            <div className="p-5">
              <p className="text-xs font-semibold text-[var(--text-sub)] mb-3">各阶段数量</p>
              <div className="space-y-2.5">
                {[
                  { label: "已投递", count: stats.total,        color: "#5B7E86" },
                  { label: "笔试",   count: written,            color: "#9C8B70" },
                  { label: "面试",   count: reachedInterview,   color: "#C0954E" },
                  { label: "Offer",  count: stats.offers,       color: "#4F8063" },
                ].map(st => {
                  const pct = stats.total > 0 ? Math.max((st.count / stats.total) * 100, st.count > 0 ? 6 : 0) : 0
                  return (
                    <div key={st.label} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-sub)] w-12 shrink-0">{st.label}</span>
                      <div className="flex-1 h-5 rounded-md bg-[var(--surface2)] overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, background: st.color }} />
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-main)] w-6 text-right shrink-0">{st.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </SheetCard>

          {/* 转化率图 */}
          <SheetCard>
            <div className="p-5">
              <p className="text-xs font-semibold text-[var(--text-sub)] mb-3">转化率</p>
              <div className="space-y-4">
                {[
                  { label: "投递 → 面试", value: convToInterview, hint: `${reachedInterview}/${stats.total || 0}` },
                  { label: "面试 → Offer", value: convToOffer,     hint: `${stats.offers}/${reachedInterview || 0}` },
                ].map(c => (
                  <div key={c.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-[var(--text-sub)]">{c.label}</span>
                      <span className="text-lg font-bold text-[var(--primary)] tracking-tight">{c.value}<span className="text-xs text-[var(--text-muted)] font-normal ml-0.5">% · {c.hint}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface2)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${c.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetCard>
        </div>

        {/* 数据驱动建议 */}
        {advices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {advices.map(a => (
              <div key={a.key}
                className={`relative overflow-hidden rounded-xl border p-4 ${
                  a.tone === "warn" ? "border-[#E3C6BC] bg-[#F1E0DA]/50" : "border-[var(--border)] bg-[var(--surface2)]"
                }`}>
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    a.tone === "warn" ? "bg-[#B6634A] text-white" : "bg-[var(--primary)] text-white"
                  }`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-main)]">{a.title}</p>
                    <p className="text-xs text-[var(--text-sub)] mt-1 leading-relaxed">{a.desc}</p>
                    <Link href={a.href} className="inline-block text-xs font-semibold text-[var(--primary)] hover:underline mt-2">{a.cta}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stats.total === 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-3 text-center">投递后自动统计各阶段数量与转化率,并按数据给出优化建议。</p>
        )}
      </div>

      {/* 投递记录标题 */}
      <SheetHeading code="T-02 / RECORDS" title="投递记录"
        right={<span className="text-xs text-[var(--text-muted)]">共 {filtered.length} 条</span>} />

      {/* 筛选栏 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]">
          <option>全部</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
          className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]">
          <option>全部</option>
          {TIERS.map(t => <option key={t}>{t}</option>)}
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索公司/岗位..."
          className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]" />
      </div>

      {/* 投递列表 */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-4 animate-pulse">
              <div className="h-3.5 w-40 rounded bg-[var(--surface2)]" />
              <div className="h-2.5 w-24 rounded bg-[var(--surface2)] mt-2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* 空态框架:画出"预留投递位"的图纸格,不留白 */
        <SheetCard>
          <div className="p-5">
            <div className="space-y-2.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-3.5">
                  <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="h-3 w-32 rounded bg-[var(--surface2)]" />
                    <div className="h-2.5 w-20 rounded bg-[var(--surface2)] mt-1.5" />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-full px-2 py-0.5 shrink-0">预留投递位</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-[var(--text-sub)]">
                {apps.length === 0 ? "还没有投递记录——记录的每一家都会在这里排布成图。" : "当前筛选下没有匹配的记录。"}
              </p>
              {apps.length === 0 && (
                <button onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  + 记录第一家投递
                </button>
              )}
            </div>
          </div>
        </SheetCard>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:shadow-sm hover:border-[var(--primary)]/40 transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-main)] text-sm">{app.company}</span>
                    <span className="text-sm text-[var(--text-sub)]">— {app.position}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: (STATUS_COLORS[app.status] || "#94a3b8") + "20", color: STATUS_COLORS[app.status] || "#94a3b8" }}>
                      {app.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: (TIER_COLORS[app.tier] || "#94a3b8") + "20", color: TIER_COLORS[app.tier] || "#94a3b8" }}>
                      {app.tier}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {app.applied_date && app.applied_date}
                    {app.source && ` · ${app.source}`}
                  </div>
                  {app.notes && (
                    <p className="text-xs text-[var(--text-sub)] mt-1 truncate">{app.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <select value={app.status} onChange={e => handleUpdateStatus(app.id, e.target.value)}
                    className="text-xs border border-[var(--border)] rounded px-1.5 py-1 bg-[var(--surface2)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleDelete(app.id)}
                    className="text-[var(--text-muted)] hover:text-[#B6634A] transition-colors text-sm px-1" title="删除">
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 侧滑复盘抽屉 */}
      {selectedApp && (
        <AppDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleUpdateStatus}
        />
      )}

      {/* 新增投递弹窗 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="font-semibold text-[var(--text-main)] text-base mb-4">新增投递记录</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">公司名称 *</label>
                  <input required value={newApp.company}
                    onChange={e => setNewApp({...newApp, company: e.target.value})}
                    placeholder="如：字节跳动" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">岗位名称 *</label>
                  <input required value={newApp.position}
                    onChange={e => setNewApp({...newApp, position: e.target.value})}
                    placeholder="如：B端产品经理" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">档位</label>
                  <select value={newApp.tier} onChange={e => setNewApp({...newApp, tier: e.target.value})}
                    className={inputCls}>
                    {TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">投递日期</label>
                  <input type="date" value={newApp.applied_date}
                    onChange={e => setNewApp({...newApp, applied_date: e.target.value})}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">截止日期</label>
                  <input type="date" value={newApp.deadline}
                    onChange={e => setNewApp({...newApp, deadline: e.target.value})}
                    className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">面试/笔试时间（选填）</label>
                  <input type="datetime-local" value={newApp.interview_at}
                    onChange={e => setNewApp({...newApp, interview_at: e.target.value})}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-medium block mb-1">备注</label>
                <textarea value={newApp.notes}
                  onChange={e => setNewApp({...newApp, notes: e.target.value})}
                  placeholder="面试感想、注意事项等..."
                  rows={2} className={inputCls + " resize-none"} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                  添加
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-[var(--border)] text-[var(--text-sub)] text-sm rounded-lg hover:bg-[var(--surface2)] transition-colors">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
