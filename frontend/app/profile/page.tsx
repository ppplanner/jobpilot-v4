"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { SHEET_GRID, SheetCard, SheetHeading } from "@/components/blueprint"

const API = ""

interface PMDirection {
  key: string
  label: string
  emoji: string
  desc: string
}

const PM_DIRECTIONS: PMDirection[] = [
  { key: "B端产品经理",  label: "B端PM",  emoji: "🏢", desc: "SaaS/工具/企业服务" },
  { key: "C端产品经理",  label: "C端PM",  emoji: "📱", desc: "App/消费者/内容/社交" },
  { key: "增长产品经理", label: "增长PM", emoji: "📈", desc: "用户增长/留存/转化" },
  { key: "数据产品经理", label: "数据PM", emoji: "📊", desc: "数据平台/BI/数据中台" },
  { key: "平台产品经理", label: "平台PM", emoji: "⚙️", desc: "中台/基础/开放平台" },
  { key: "游戏产品经理", label: "游戏PM", emoji: "🎮", desc: "手游/端游/游戏运营" },
  { key: "AI产品经理",  label: "AI PM",  emoji: "🤖", desc: "大模型/智能体/AI应用" },
  { key: "产品经理",    label: "通用PM", emoji: "🧭", desc: "尚未确定细分方向" },
]

interface BasicInfo {
  name?: string; school?: string; major?: string; degree?: string
  gpa?: string; graduation?: string; target_role?: string; target_city?: string; self_intro?: string
}
interface Internship {
  id: number; company: string; position: string; start_date: string
  end_date: string; is_current: number; department: string; highlights: string
}
interface Project {
  id: number; name: string; role: string; start_date: string; end_date: string
  background: string; contribution: string; result: string; tech_stack: string
}
interface Skill {
  id: number; category: string; skill_name: string; level: string
}

const INPUT = "w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"
const LABEL = "text-xs text-[var(--text-muted)] mb-1 block"

// 区块:图纸编号标题 + 图纸卡片(与首页各区一致)
function Section({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <div>
      <SheetHeading code={code} title={title} />
      <SheetCard><div className="p-5">{children}</div></SheetCard>
    </div>
  )
}

const LEVEL_STYLE: Record<string, string> = {
  精通: "bg-[var(--primary)] text-white",
  熟练: "bg-[var(--surface2)] text-[var(--primary)] border border-[var(--border)]",
  了解: "bg-[var(--surface2)] text-[var(--text-muted)] border border-[var(--border)]",
}

export default function ProfilePage() {
  const [tab, setTab] = useState<"basic" | "internship" | "project" | "skill">("basic")
  const [basic, setBasic] = useState<BasicInfo>({})
  const [internships, setInternships] = useState<Internship[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  // 从首页能力胶囊跳来时:?focus=internship-4 / project-2 → 切到对应 tab、滚动并高亮该素材
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const focusHandled = useRef(false)

  useEffect(() => {
    if (focusHandled.current) return
    const f = new URLSearchParams(window.location.search).get("focus")
    if (!f) return
    const [type, idStr] = f.split("-")
    if (!["internship", "project"].includes(type) || !Number(idStr)) { focusHandled.current = true; return }
    const ready = type === "internship" ? internships.length : projects.length
    if (!ready) return   // 等数据加载后这个 effect 会再跑
    focusHandled.current = true
    setTab(type as "internship" | "project")
    setFocusKey(f)
    setTimeout(() => document.getElementById(f)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100)
    setTimeout(() => setFocusKey(null), 3000)
  }, [internships, projects])

  useEffect(() => {
    const load = async () => {
      try {
        const [b, i, p, s] = await Promise.all([
          fetch(`${API}/api/v1/profile/basic`).then(r => r.json()),
          fetch(`${API}/api/v1/profile/internships`).then(r => r.json()),
          fetch(`${API}/api/v1/profile/projects`).then(r => r.json()),
          fetch(`${API}/api/v1/profile/skills`).then(r => r.json()),
        ])
        setBasic(b || {})
        setInternships(i || [])
        setProjects(p || [])
        setSkills(s || [])
      } catch { }
    }
    load()
  }, [])

  const showMsg = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(""), 2500)
  }

  const saveBasic = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/api/v1/profile/basic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basic),
      })
      showMsg("基本信息已保存")
    } catch { showMsg("保存失败") }
    finally { setSaving(false) }
  }

  const [newIntern, setNewIntern] = useState({ company: "", position: "", start_date: "", end_date: "", department: "", highlights: "" })
  const [editInternId, setEditInternId] = useState<number | null>(null)
  const [editInternData, setEditInternData] = useState<Partial<Internship>>({})

  const startEditIntern = (item: Internship) => {
    setEditInternId(item.id)
    setEditInternData({ ...item })
  }
  const saveIntern = async (id: number) => {
    try {
      await fetch(`${API}/api/v1/profile/internships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editInternData),
      })
      setInternships(internships.map(i => i.id === id ? { ...i, ...editInternData } as Internship : i))
      setEditInternId(null)
      showMsg("实习经历已保存")
    } catch { showMsg("保存失败") }
  }

  const addIntern = async () => {
    if (!newIntern.company || !newIntern.position) return
    try {
      const r = await fetch(`${API}/api/v1/profile/internships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIntern),
      }).then(r => r.json())
      setInternships([...internships, { ...newIntern, id: r.id, is_current: 0 }])
      setNewIntern({ company: "", position: "", start_date: "", end_date: "", department: "", highlights: "" })
      showMsg("已添加实习经历")
    } catch { showMsg("添加失败") }
  }
  const delIntern = async (id: number) => {
    try {
      await fetch(`${API}/api/v1/profile/internships/${id}`, { method: "DELETE" })
      setInternships(internships.filter(i => i.id !== id))
    } catch { }
  }

  const [newProj, setNewProj] = useState({ name: "", role: "", start_date: "", end_date: "", background: "", contribution: "", result: "", tech_stack: "" })
  const [editProjId, setEditProjId] = useState<number | null>(null)
  const [editProjData, setEditProjData] = useState<Partial<Project>>({})

  const startEditProj = (item: Project) => {
    setEditProjId(item.id)
    setEditProjData({ ...item })
  }
  const saveProj = async (id: number) => {
    try {
      await fetch(`${API}/api/v1/profile/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProjData),
      })
      setProjects(projects.map(p => p.id === id ? { ...p, ...editProjData } as Project : p))
      setEditProjId(null)
      showMsg("项目经历已保存")
    } catch { showMsg("保存失败") }
  }

  const addProj = async () => {
    if (!newProj.name || !newProj.role) return
    try {
      const r = await fetch(`${API}/api/v1/profile/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProj),
      }).then(r => r.json())
      setProjects([...projects, { ...newProj, id: r.id }])
      setNewProj({ name: "", role: "", start_date: "", end_date: "", background: "", contribution: "", result: "", tech_stack: "" })
      showMsg("已添加项目经历")
    } catch { showMsg("添加失败") }
  }
  const delProj = async (id: number) => {
    try {
      await fetch(`${API}/api/v1/profile/projects/${id}`, { method: "DELETE" })
      setProjects(projects.filter(p => p.id !== id))
    } catch { }
  }

  const [newSkill, setNewSkill] = useState({ category: "产品工具", skill_name: "", level: "熟练" })
  const SKILL_CATS = ["产品工具", "数据分析", "编程能力", "软技能", "行业知识"]
  const addSkill = async () => {
    if (!newSkill.skill_name) return
    try {
      const r = await fetch(`${API}/api/v1/profile/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      }).then(r => r.json())
      setSkills([...skills, { ...newSkill, id: r.id }])
      setNewSkill({ ...newSkill, skill_name: "" })
      showMsg("已添加技能")
    } catch { showMsg("添加失败") }
  }
  const delSkill = async (id: number) => {
    try {
      await fetch(`${API}/api/v1/profile/skills/${id}`, { method: "DELETE" })
      setSkills(skills.filter(s => s.id !== id))
    } catch { }
  }

  const TABS = [
    { key: "basic",      label: "基本信息" },
    { key: "internship", label: "实习经历" },
    { key: "project",    label: "项目经历" },
    { key: "skill",      label: "技能标签" },
  ] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={SHEET_GRID}>
      <div className="mb-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">Material Library</p>
        <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">简历素材库</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">维护实习、项目和技能，简历工作台与首页能力图层可直接调取，无需每次重新粘贴。</p>
      </div>

      {/* PM 方向 */}
      <div className="mb-4">
        <SheetHeading code="P-01 / DIRECTION" title="目标 PM 方向"
          right={<span className="text-xs text-[var(--text-muted)]">影响简历改写与题库筛选</span>} />
        <SheetCard>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PM_DIRECTIONS.map(d => {
                const isSelected = (basic.target_role || "产品经理") === d.key
                return (
                  <button
                    key={d.key}
                    onClick={() => setBasic({ ...basic, target_role: d.key })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-bg)]"
                        : "border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-main)]"}`}>{d.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{d.desc}</div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              当前方向：<strong className="text-[var(--primary)]">{basic.target_role || "产品经理"}</strong> ——选好后到「基本信息」点保存。
            </p>
          </div>
        </SheetCard>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-3 bg-[var(--primary-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--primary)] font-medium">
          {saveMsg}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--surface2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 基本信息 */}
      {tab === "basic" && (
        <Section code="P-02 / BASIC" title="基本信息">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "name",        label: "姓名",     ph: "张三" },
              { key: "school",      label: "学校",     ph: "北京大学" },
              { key: "major",       label: "专业",     ph: "信息管理与信息系统" },
              { key: "degree",      label: "学历",     ph: "硕士" },
              { key: "gpa",         label: "GPA",      ph: "3.8/4.0" },
              { key: "graduation",  label: "毕业时间", ph: "2026-06" },
              { key: "target_role", label: "目标岗位", ph: "B端产品经理" },
              { key: "target_city", label: "目标城市", ph: "北京 / 上海" },
            ].map(f => (
              <div key={f.key}>
                <label className={LABEL}>{f.label}</label>
                <input
                  value={(basic as any)[f.key] || ""}
                  onChange={e => setBasic({ ...basic, [f.key]: e.target.value })}
                  placeholder={f.ph}
                  className={INPUT}
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className={LABEL}>个人简介（一句话介绍自己）</label>
            <textarea
              value={basic.self_intro || ""}
              onChange={e => setBasic({ ...basic, self_intro: e.target.value })}
              placeholder="如：即将毕业的信管硕士，有3段B端产品实习，熟悉SaaS工作流产品设计，目标大厂B端PM..."
              rows={3}
              className={INPUT + " resize-none"}
            />
          </div>
          <div className="mt-5">
            <button onClick={saveBasic} disabled={saving}
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
              {saving ? "保存中..." : "保存基本信息"}
            </button>
          </div>
        </Section>
      )}

      {/* 实习经历 */}
      {tab === "internship" && (
        <div className="space-y-4">
          {internships.length > 0 && (
            <div className="space-y-3">
              {internships.map(item => (
                <div key={item.id} id={`internship-${item.id}`}
                  className={`bg-[var(--surface)] border rounded-xl p-4 transition-all ${focusKey === `internship-${item.id}` ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/40" : "border-[var(--border)]"}`}>
                  {editInternId === item.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL}>公司名称</label>
                          <input value={editInternData.company || ""} onChange={e => setEditInternData({ ...editInternData, company: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>岗位名称</label>
                          <input value={editInternData.position || ""} onChange={e => setEditInternData({ ...editInternData, position: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>所在部门</label>
                          <input value={editInternData.department || ""} onChange={e => setEditInternData({ ...editInternData, department: e.target.value })} className={INPUT} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={LABEL}>开始时间</label>
                            <input value={editInternData.start_date || ""} onChange={e => setEditInternData({ ...editInternData, start_date: e.target.value })} placeholder="2025.06" className={INPUT} />
                          </div>
                          <div>
                            <label className={LABEL}>结束时间</label>
                            <input value={editInternData.end_date || ""} onChange={e => setEditInternData({ ...editInternData, end_date: e.target.value })} placeholder="2025.09" className={INPUT} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={LABEL}>工作亮点</label>
                        <textarea value={editInternData.highlights || ""} onChange={e => setEditInternData({ ...editInternData, highlights: e.target.value })} rows={4} className={INPUT + " resize-none"} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveIntern(item.id)} className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity">保存</button>
                        <button onClick={() => setEditInternId(null)} className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-sub)] text-xs rounded-lg hover:bg-[var(--surface2)] transition-colors">取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[var(--text-main)] text-sm">{item.company}</p>
                          <p className="text-xs text-[var(--text-sub)]">{item.position}{item.department ? ` · ${item.department}` : ""}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.start_date}{item.start_date && " — "}{item.is_current ? "至今" : item.end_date}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEditIntern(item)} className="text-xs text-[var(--primary)] hover:opacity-70 transition-opacity px-2 py-1">编辑</button>
                          <button onClick={() => delIntern(item.id)} className="text-xs text-[var(--text-muted)] hover:text-[#B6634A] transition-colors px-2 py-1">删除</button>
                        </div>
                      </div>
                      {item.highlights && (
                        <p className="text-xs text-[var(--text-sub)] leading-relaxed bg-[var(--surface2)] rounded-lg p-2 mt-2 whitespace-pre-wrap">{item.highlights}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <Section code="P-03 / INTERNSHIP" title="添加实习经历">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>公司名称 *</label>
                <input value={newIntern.company} onChange={e => setNewIntern({ ...newIntern, company: e.target.value })}
                  placeholder="如：字节跳动" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>岗位名称 *</label>
                <input value={newIntern.position} onChange={e => setNewIntern({ ...newIntern, position: e.target.value })}
                  placeholder="如：产品经理实习生" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>所在部门</label>
                <input value={newIntern.department} onChange={e => setNewIntern({ ...newIntern, department: e.target.value })}
                  placeholder="如：商业化产品部" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>开始时间</label>
                  <input value={newIntern.start_date} onChange={e => setNewIntern({ ...newIntern, start_date: e.target.value })}
                    placeholder="2025.06" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>结束时间</label>
                  <input value={newIntern.end_date} onChange={e => setNewIntern({ ...newIntern, end_date: e.target.value })}
                    placeholder="2025.09" className={INPUT} />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className={LABEL}>工作亮点（每行一条，后续可直接用于简历改写）</label>
              <textarea value={newIntern.highlights} onChange={e => setNewIntern({ ...newIntern, highlights: e.target.value })}
                placeholder={"• 负责商家中台权限管理模块需求分析，输出PRD...\n• 主导用户调研，访谈15名商家运营人员...\n• 推动上线后DAU提升23%"}
                rows={4} className={INPUT + " resize-none"} />
            </div>
            <button onClick={addIntern} disabled={!newIntern.company || !newIntern.position}
              className="mt-4 px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              + 添加
            </button>
          </Section>
        </div>
      )}

      {/* 项目经历 */}
      {tab === "project" && (
        <div className="space-y-4">
          {projects.length > 0 && (
            <div className="space-y-3">
              {projects.map(item => (
                <div key={item.id} id={`project-${item.id}`}
                  className={`bg-[var(--surface)] border rounded-xl p-4 transition-all ${focusKey === `project-${item.id}` ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/40" : "border-[var(--border)]"}`}>
                  {editProjId === item.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL}>项目名称</label>
                          <input value={editProjData.name || ""} onChange={e => setEditProjData({ ...editProjData, name: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>担任角色</label>
                          <input value={editProjData.role || ""} onChange={e => setEditProjData({ ...editProjData, role: e.target.value })} className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>开始时间</label>
                          <input value={editProjData.start_date || ""} onChange={e => setEditProjData({ ...editProjData, start_date: e.target.value })} placeholder="2025.01" className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>结束时间</label>
                          <input value={editProjData.end_date || ""} onChange={e => setEditProjData({ ...editProjData, end_date: e.target.value })} placeholder="2025.06" className={INPUT} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className={LABEL}>项目背景</label>
                          <textarea value={editProjData.background || ""} onChange={e => setEditProjData({ ...editProjData, background: e.target.value })} rows={2} className={INPUT + " resize-none"} />
                        </div>
                        <div>
                          <label className={LABEL}>我的贡献</label>
                          <textarea value={editProjData.contribution || ""} onChange={e => setEditProjData({ ...editProjData, contribution: e.target.value })} rows={3} className={INPUT + " resize-none"} />
                        </div>
                        <div>
                          <label className={LABEL}>项目结果</label>
                          <textarea value={editProjData.result || ""} onChange={e => setEditProjData({ ...editProjData, result: e.target.value })} rows={2} className={INPUT + " resize-none"} />
                        </div>
                        <div>
                          <label className={LABEL}>技术栈/工具</label>
                          <input value={editProjData.tech_stack || ""} onChange={e => setEditProjData({ ...editProjData, tech_stack: e.target.value })} className={INPUT} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveProj(item.id)} className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity">保存</button>
                        <button onClick={() => setEditProjId(null)} className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-sub)] text-xs rounded-lg hover:bg-[var(--surface2)] transition-colors">取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[var(--text-main)] text-sm">{item.name}</p>
                          <p className="text-xs text-[var(--text-sub)]">{item.role}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.start_date}{item.start_date && " — "}{item.end_date}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEditProj(item)} className="text-xs text-[var(--primary)] hover:opacity-70 transition-opacity px-2 py-1">编辑</button>
                          <button onClick={() => delProj(item.id)} className="text-xs text-[var(--text-muted)] hover:text-[#B6634A] px-2 py-1">删除</button>
                        </div>
                      </div>
                      {item.contribution && (
                        <p className="text-xs text-[var(--text-sub)] bg-[var(--surface2)] rounded-lg p-2 mt-2 whitespace-pre-wrap">{item.contribution}</p>
                      )}
                      {item.result && (
                        <p className="text-xs text-[var(--primary)] bg-[var(--primary-bg)] rounded-lg p-2 mt-2">{item.result}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <Section code="P-04 / PROJECT" title="添加项目经历">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>项目名称 *</label>
                <input value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })}
                  placeholder="如：B端权限管理系统" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>担任角色 *</label>
                <input value={newProj.role} onChange={e => setNewProj({ ...newProj, role: e.target.value })}
                  placeholder="如：产品负责人" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>开始时间</label>
                <input value={newProj.start_date} onChange={e => setNewProj({ ...newProj, start_date: e.target.value })}
                  placeholder="2025.01" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>结束时间</label>
                <input value={newProj.end_date} onChange={e => setNewProj({ ...newProj, end_date: e.target.value })}
                  placeholder="2025.06" className={INPUT} />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className={LABEL}>项目背景（为什么做这个）</label>
                <textarea value={newProj.background} onChange={e => setNewProj({ ...newProj, background: e.target.value })}
                  placeholder="公司需要解决什么问题，业务背景是什么..." rows={2} className={INPUT + " resize-none"} />
              </div>
              <div>
                <label className={LABEL}>我的贡献（做了什么）</label>
                <textarea value={newProj.contribution} onChange={e => setNewProj({ ...newProj, contribution: e.target.value })}
                  placeholder="负责需求分析、PRD撰写、产品迭代..." rows={3} className={INPUT + " resize-none"} />
              </div>
              <div>
                <label className={LABEL}>项目结果（量化成果）</label>
                <textarea value={newProj.result} onChange={e => setNewProj({ ...newProj, result: e.target.value })}
                  placeholder="上线后转化率提升30%，节省人工成本XX万..." rows={2} className={INPUT + " resize-none"} />
              </div>
              <div>
                <label className={LABEL}>技术栈/工具</label>
                <input value={newProj.tech_stack} onChange={e => setNewProj({ ...newProj, tech_stack: e.target.value })}
                  placeholder="Axure / SQL / Figma / 飞书多维表格" className={INPUT} />
              </div>
            </div>
            <button onClick={addProj} disabled={!newProj.name || !newProj.role}
              className="mt-4 px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              + 添加
            </button>
          </Section>
        </div>
      )}

      {/* 技能标签 */}
      {tab === "skill" && (
        <div className="space-y-4">
          {skills.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              {SKILL_CATS.map(cat => {
                const catSkills = skills.filter(s => s.category === cat)
                if (!catSkills.length) return null
                return (
                  <div key={cat} className="mb-4 last:mb-0">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {catSkills.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 group">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LEVEL_STYLE[s.level] || LEVEL_STYLE["熟练"]}`}>
                            {s.skill_name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{s.level}</span>
                          <button onClick={() => delSkill(s.id)}
                            className="text-[var(--text-muted)] hover:text-[#B6634A] opacity-0 group-hover:opacity-100 transition-all text-xs">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Section code="P-05 / SKILL" title="添加技能">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>分类</label>
                <select value={newSkill.category} onChange={e => setNewSkill({ ...newSkill, category: e.target.value })}
                  className={INPUT}>
                  {SKILL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>技能名称 *</label>
                <input value={newSkill.skill_name} onChange={e => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                  placeholder="如：Axure / SQL / JIRA" className={INPUT}
                  onKeyDown={e => e.key === "Enter" && addSkill()} />
              </div>
              <div>
                <label className={LABEL}>熟悉程度</label>
                <select value={newSkill.level} onChange={e => setNewSkill({ ...newSkill, level: e.target.value })}
                  className={INPUT}>
                  {["精通", "熟练", "了解"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button onClick={addSkill} disabled={!newSkill.skill_name}
                className="px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
                + 添加技能
              </button>
              <p className="text-xs text-[var(--text-muted)]">按 Enter 快速添加</p>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2">B端PM常用工具快速添加：</p>
              <div className="flex flex-wrap gap-2">
                {["Axure", "Figma", "Sketch", "JIRA", "Confluence", "SQL", "Python基础", "Tableau", "飞书", "Notion"].map(tool => (
                  <button key={tool}
                    onClick={() => {
                      const cat = ["SQL", "Python基础", "Tableau"].includes(tool) ? "数据分析" : "产品工具"
                      fetch(`${API}/api/v1/profile/skills`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ category: cat, skill_name: tool, level: "熟练" }),
                      }).then(r => r.json()).then(r => {
                        setSkills(prev => [...prev, { id: r.id, category: cat, skill_name: tool, level: "熟练" }])
                        showMsg(`已添加 ${tool}`)
                      }).catch(() => { })
                    }}
                    className="text-xs px-2.5 py-1 bg-[var(--surface2)] text-[var(--text-sub)] rounded-full hover:bg-[var(--border)] transition-colors">
                    + {tool}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
