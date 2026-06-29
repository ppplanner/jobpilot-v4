"use client"

import { useState, useRef, useCallback, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { api, RewriteResult, ProfileInternship, ProfileProject, ProfileSkill, Application } from "@/lib/api"

interface JDMatchItem {
  aspect: string
  jd_requirement: string
  resume_status: "strong" | "weak" | "missing"
  suggestion: string
}
interface InterviewerAnalysis {
  overall_score: number
  summary: string
  match_items: JDMatchItem[]
  follow_up_questions: Array<{ bullet: string; question: string; can_answer: boolean }>
  weak_signals: string[]
  strong_signals: string[]
  raw?: string
}

const API = ""

const SECTION_HEADERS = [
  '教育背景', '教育经历', '学历背景',
  '实习经历', '工作经历', '实习/工作经历',
  '项目经历', '项目经验',
  '技能', '专业技能', '技能特长',
  '荣誉奖项', '获奖经历', '荣誉与奖项',
  '自我评价', '个人简介', '个人总结',
  '校园经历', '社团活动', '在校经历',
]

function formatResumeText(raw: string): string {
  let text = raw
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
  for (const h of SECTION_HEADERS) {
    text = text.replace(new RegExp(`([^\n])(${h}[：:])`, 'g'), '$1\n\n$2')
  }
  return text.trim()
}

// ===== 素材库导入组件 =====
// 单条经历 → 文本（供素材库导入与 JD 匹配推荐共用，避免格式漂移）
function internToText(i: ProfileInternship): string {
  const date = i.start_date ? ` | ${i.start_date} - ${i.is_current ? "至今" : i.end_date}` : ""
  const lines = [`${i.company} · ${i.position}${i.department ? " · " + i.department : ""}${date}`]
  if (i.highlights) lines.push(i.highlights)
  return lines.join("\n")
}

function projectToText(p: ProfileProject): string {
  const date = p.start_date ? ` | ${p.start_date} - ${p.end_date || "至今"}` : ""
  const lines = [`${p.name} · ${p.role}${date}`]
  if (p.background) lines.push(`背景：${p.background}`)
  if (p.contribution) lines.push(`贡献：${p.contribution}`)
  if (p.result) lines.push(`成果：${p.result}`)
  if (p.tech_stack) lines.push(`技术栈：${p.tech_stack}`)
  return lines.join("\n")
}

function composeText(
  interns: ProfileInternship[], projects: ProfileProject[], skills: ProfileSkill[],
  selInterns: Set<number>, selProjects: Set<number>, withSkills: boolean
): string {
  const lines: string[] = []
  const chosenInterns = interns.filter(i => selInterns.has(i.id))
  if (chosenInterns.length > 0) {
    lines.push("【实习经历】")
    chosenInterns.forEach(i => { lines.push(internToText(i)); lines.push("") })
  }
  const chosenProjects = projects.filter(p => selProjects.has(p.id))
  if (chosenProjects.length > 0) {
    lines.push("【项目经历】")
    chosenProjects.forEach(p => { lines.push(projectToText(p)); lines.push("") })
  }
  if (withSkills && skills.length > 0) {
    lines.push("【技能】")
    const grouped = skills.reduce((acc, s) => {
      acc[s.category] = acc[s.category] || []
      acc[s.category].push(s.skill_name)
      return acc
    }, {} as Record<string, string[]>)
    Object.entries(grouped).forEach(([cat, items]) => lines.push(`${cat}：${items.join(" / ")}`))
  }
  return lines.join("\n").trim()
}

function MaterialImporter({ onImport }: { onImport: (text: string) => void }) {
  const [interns, setInterns] = useState<ProfileInternship[]>([])
  const [projects, setProjects] = useState<ProfileProject[]>([])
  const [skills, setSkills] = useState<ProfileSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [selInterns, setSelInterns] = useState<Set<number>>(new Set())
  const [selProjects, setSelProjects] = useState<Set<number>>(new Set())
  const [withSkills, setWithSkills] = useState(true)

  useEffect(() => {
    Promise.all([
      api.profile.getInternships(),
      api.profile.getProjects(),
      api.profile.getSkills(),
    ]).then(([i, p, s]) => {
      setInterns(i); setProjects(p); setSkills(s)
      setSelInterns(new Set(i.map(x => x.id)))
      setSelProjects(new Set(p.map(x => x.id)))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = (id: number, set: Set<number>, setter: (s: Set<number>) => void) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setter(next)
  }

  const isEmpty = !loading && interns.length === 0 && projects.length === 0

  if (loading) return <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载素材库...</div>

  if (isEmpty) return (
    <div className="py-10 text-center space-y-3">
      <p className="text-2xl">📦</p>
      <p className="text-sm font-medium text-[var(--text-main)]">素材库还没有内容</p>
      <p className="text-xs text-[var(--text-muted)]">先去添加你的实习和项目经历，下次改写直接调取，无需重复粘贴</p>
      <Link href="/profile"
        className="inline-block mt-2 px-5 py-2 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity">
        去建立素材库 →
      </Link>
    </div>
  )

  const checkboxCls = "w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer shrink-0"
  const sectionTitle = "text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2"

  return (
    <div className="space-y-5">
      {interns.length > 0 && (
        <div>
          <p className={sectionTitle}>实习经历（{interns.length}）</p>
          <div className="space-y-2">
            {interns.map(i => (
              <label key={i.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface2)] cursor-pointer transition-colors">
                <input type="checkbox" className={checkboxCls} checked={selInterns.has(i.id)}
                  onChange={() => toggle(i.id, selInterns, setSelInterns)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {i.company} · <span className="font-normal">{i.position}</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {i.start_date}{i.start_date && " - "}{i.is_current ? "至今" : i.end_date}
                    {i.department && ` · ${i.department}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div>
          <p className={sectionTitle}>项目经历（{projects.length}）</p>
          <div className="space-y-2">
            {projects.map(p => (
              <label key={p.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface2)] cursor-pointer transition-colors">
                <input type="checkbox" className={checkboxCls} checked={selProjects.has(p.id)}
                  onChange={() => toggle(p.id, selProjects, setSelProjects)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {p.name} · <span className="font-normal">{p.role}</span>
                  </p>
                  {p.start_date && (
                    <p className="text-xs text-[var(--text-muted)]">{p.start_date} - {p.end_date || "至今"}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface2)] cursor-pointer transition-colors">
          <input type="checkbox" className={checkboxCls} checked={withSkills}
            onChange={() => setWithSkills(!withSkills)} />
          <span className="text-sm text-[var(--text-main)]">包含技能描述
            <span className="text-xs text-[var(--text-muted)] ml-1">（{skills.length} 项技能）</span>
          </span>
        </label>
      )}

      <button
        onClick={() => {
          const text = composeText(interns, projects, skills, selInterns, selProjects, withSkills)
          if (text) onImport(text)
        }}
        disabled={selInterns.size === 0 && selProjects.size === 0}
        className="w-full py-2.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
        导入所选内容
      </button>
    </div>
  )
}

function VersionHistoryPanel({ refreshKey, autoExpandVersionId }: { refreshKey: number; autoExpandVersionId?: number }) {
  const [versions, setVersions] = useState<import("@/lib/api").ResumeVersion[]>([])
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    api.resume.getVersions().then(setVersions).catch(() => {})
  }, [refreshKey])

  // 如果有 autoExpandVersionId，自动展开该版本
  useEffect(() => {
    if (autoExpandVersionId && versions.length > 0) {
      setOpen(true)
      setExpanded(autoExpandVersionId)
      // 延迟滚动到该版本
      setTimeout(() => {
        const element = document.getElementById(`version-${autoExpandVersionId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [autoExpandVersionId, versions])

  if (versions.length === 0) return null

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface2)] transition-colors"
      >
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
          历史版本（{versions.length}）
        </span>
        <span className="text-[var(--text-muted)] text-xs">{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>

      {open && (
        <div className="divide-y divide-[var(--border)]">
          {versions.map(v => {
            let analysis: InterviewerAnalysis | null = null
            try { if (v.analysis_json) analysis = JSON.parse(v.analysis_json) } catch { }
            const isExp = expanded === v.id
            return (
              <div key={v.id} id={`version-${v.id}`} className="px-5 py-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isExp ? null : v.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-[var(--text-main)] truncate">{v.version_name}</span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {v.created_at?.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {analysis && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        analysis.overall_score >= 80 ? "bg-green-50 text-green-700" :
                        analysis.overall_score >= 60 ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {analysis.overall_score}分
                      </span>
                    )}
                    <span className="text-[var(--text-muted)] text-xs">{isExp ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExp && analysis && (
                  <div className="mt-3 space-y-2">
                    {analysis.summary && (
                      <p className="text-xs text-[var(--text-sub)] bg-[var(--surface2)] rounded-lg px-3 py-2">
                        {analysis.summary}
                      </p>
                    )}
                    {analysis.match_items?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.match_items.map((item, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                            item.resume_status === "strong"  ? "bg-green-50 text-green-700" :
                            item.resume_status === "weak"    ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-700"
                          }`}>
                            {item.aspect}·{item.resume_status === "strong" ? "命中" : item.resume_status === "weak" ? "较弱" : "缺失"}
                          </span>
                        ))}
                      </div>
                    )}
                    {analysis.follow_up_questions?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[var(--text-muted)]">追问预警</p>
                        {analysis.follow_up_questions.map((q, i) => (
                          <p key={i} className="text-xs text-[var(--text-sub)] pl-2 border-l-2 border-amber-300">
                            {q.question}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {isExp && !analysis && (
                  <p className="mt-2 text-xs text-[var(--text-muted)] italic">此版本保存时未进行面试官分析</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function diffHighlight(original: string, rewritten: string): React.ReactNode {
  const origWords = new Set(original.split(/\s+/).filter(Boolean))
  const parts = rewritten.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) => {
        const isNew = part.trim() && !origWords.has(part.trim())
        return isNew ? (
          <mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5 not-italic">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

function ResumeDropZone({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const allowed = [".pdf", ".docx", ".txt", ".doc"]
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase()
    if (!allowed.includes(ext)) {
      setUploadError(`不支持 ${ext} 格式，请上传 PDF / DOCX / TXT`)
      return
    }
    setUploading(true)
    setUploadMsg("")
    setUploadError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const resp = await fetch(`${API}/api/v1/resume/upload`, { method: "POST", body: formData })
      if (!resp.ok) {
        const errText = await resp.text()
        let detail = `上传失败 (${resp.status})`
        try { detail = JSON.parse(errText).detail || detail } catch { detail = errText || detail }
        throw new Error(detail)
      }
      const data = await resp.json()
      onChange(formatResumeText(data.text))
      setUploadMsg(`已从「${file.name}」提取 ${data.char_count} 字`)
    } catch (e: any) {
      setUploadError(e.message || "文件解析失败")
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-2">
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !value && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary-bg)] scale-[1.01]"
            : value
            ? "border-[var(--border)] bg-[var(--surface)] cursor-default"
            : "border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--primary)] hover:bg-[var(--primary-bg)] cursor-pointer"
        }`}
      >
        {!value && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center pointer-events-none">
            <div className={`text-4xl mb-3 transition-transform ${isDragging ? "scale-125" : ""}`}>
              {uploading ? "⏳" : "📄"}
            </div>
            {uploading ? (
              <p className="text-sm text-[var(--primary)] font-medium animate-pulse">解析中...</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--text-main)] mb-1">
                  {isDragging ? "松开即可上传" : "拖拽简历到这里，或点击选择文件"}
                </p>
                <p className="text-xs text-[var(--text-muted)]">支持 PDF / DOCX / TXT，最大 10MB</p>
              </>
            )}
          </div>
        )}

        {value && (
          <>
            <textarea
              rows={14}
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-[var(--text-main)] bg-transparent resize-none focus:outline-none"
              placeholder="粘贴你的完整简历..."
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="text-xs px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-sub)] hover:border-[var(--primary)] transition-colors shadow-sm"
              >
                重新上传
              </button>
              <button
                onClick={e => { e.stopPropagation(); onChange(""); setUploadMsg("") }}
                className="text-xs px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:border-red-300 transition-colors shadow-sm"
              >
                ×
              </button>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />

      {uploadMsg && <p className="text-xs text-green-600">{uploadMsg}</p>}
      {uploadError && <p className="text-xs text-red-500">⚠ {uploadError}</p>}
      {value && <p className="text-xs text-[var(--text-muted)]">{value.length} 字 · 也可直接在上方编辑</p>}
    </div>
  )
}

function JDTextArea({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState("")
  const [ocrError, setOcrError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith("image/"))
    if (!imageItem) return

    e.preventDefault()
    setOcrLoading(true)
    setOcrMsg("")
    setOcrError("")

    try {
      const blob = imageItem.getAsFile()
      if (!blob) throw new Error("无法读取图片")
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const resp = await fetch(`${API}/api/v1/resume/parse-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64, hint: "jd" }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || "识别失败")
      onChange(value ? value + "\n\n" + data.text : data.text)
      setOcrMsg(`截图识别成功，已提取 ${data.text.length} 字`)
    } catch (e: any) {
      const msg = e.message || "识别失败"
      if (msg.includes("Vision") || msg.includes("vision") || msg.includes("422")) {
        setOcrError("当前模型不支持图片识别，请直接复制JD文字粘贴")
      } else {
        setOcrError("截图识别失败：" + msg)
      }
    } finally {
      setOcrLoading(false)
    }
  }, [value, onChange])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-muted)]">岗位 JD（可选，AI 将据此针对性改写）</label>
        <span className="text-xs text-[var(--text-muted)]">支持 Ctrl+V 粘贴截图</span>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={8}
          value={value}
          onChange={e => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={ocrLoading ? "正在识别截图文字，请稍候..." : "粘贴完整JD文字，或直接 Ctrl+V 粘贴JD截图（AI自动识别文字）..."}
          disabled={ocrLoading}
          className={`w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none transition-all placeholder:text-[var(--text-muted)] ${ocrLoading ? "opacity-60 cursor-wait" : ""}`}
        />
        {ocrLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
            <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
              <svg className="animate-spin h-4 w-4 text-[var(--primary)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm text-[var(--text-main)] font-medium">AI 正在识别截图文字...</span>
            </div>
          </div>
        )}
      </div>

      {ocrMsg && <p className="text-xs text-green-600">{ocrMsg}</p>}
      {ocrError && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="shrink-0">⚠</span>
          <span>{ocrError}</span>
        </div>
      )}
    </div>
  )
}

function WordCountPanel({ originalCount, rewrittenCount }: {
  originalCount: number; rewrittenCount: number | null
}) {
  const diff = rewrittenCount !== null ? rewrittenCount - originalCount : null

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">字数统计</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--surface2)] rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">原始字数</p>
          <p className="text-lg font-bold text-[var(--text-sub)]">{originalCount > 0 ? originalCount : "—"}</p>
          <p className="text-xs text-[var(--text-muted)]">字</p>
        </div>

        <div className={`rounded-lg px-3 py-2.5 text-center ${
          rewrittenCount !== null
            ? diff !== null && diff > 0 ? "bg-green-50 border border-green-200"
            : diff !== null && diff < 0 ? "bg-blue-50 border border-blue-200"
            : "bg-[var(--surface2)]"
            : "bg-[var(--surface2)]"
        }`}>
          <p className="text-xs text-[var(--text-muted)] mb-1">改写后字数</p>
          <p className={`text-lg font-bold ${
            rewrittenCount !== null
              ? diff !== null && diff > 0 ? "text-green-700"
              : diff !== null && diff < 0 ? "text-blue-700" : "text-[var(--text-sub)]"
              : "text-[var(--border)]"
          }`}>
            {rewrittenCount !== null ? rewrittenCount : "—"}
          </p>
          {diff !== null && (
            <p className={`text-xs font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-blue-600" : "text-[var(--text-muted)]"}`}>
              {diff > 0 ? `+${diff}` : diff === 0 ? "持平" : `${diff}`} 字
            </p>
          )}
          {rewrittenCount === null && <p className="text-xs text-[var(--text-muted)]">待生成</p>}
        </div>
      </div>
    </div>
  )
}

function ResumePageInner() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [step1Mode, setStep1Mode] = useState<"upload" | "library">("upload")
  const [resumeText, setResumeText] = useState("")
  const [jdText, setJdText] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [mode, setMode] = useState<"light" | "deep">("light")
  const [result, setResult] = useState<RewriteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [originalWordCount, setOriginalWordCount] = useState(0)
  const [rewrittenWordCount, setRewrittenWordCount] = useState<number | null>(null)

  const [savingVersion, setSavingVersion] = useState(false)
  const [versionSaved, setVersionSaved] = useState(false)
  const [autoSynced, setAutoSynced] = useState(false)
  const [libToast, setLibToast] = useState<string | null>(null)
  const [libSynced, setLibSynced] = useState(false)

  const [interviewerAnalysis, setInterviewerAnalysis] = useState<InterviewerAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisError, setAnalysisError] = useState("")
  const [versionsKey, setVersionsKey] = useState(0)

  const [jdProfile, setJdProfile] = useState<{
    pm_type: string; experience_level: string;
    key_dimensions: Array<{ name: string; priority: string; detail: string }>
    ideal_profile: string; rewrite_focus: string
  } | null>(null)
  const [analyzingJd, setAnalyzingJd] = useState(false)
  const [jdProfileError, setJdProfileError] = useState("")

  // JD → 素材库经历匹配推荐
  const [libInterns, setLibInterns] = useState<ProfileInternship[]>([])
  const [libProjects, setLibProjects] = useState<ProfileProject[]>([])
  const [matchResult, setMatchResult] = useState<{
    internships: Array<{ id: number; match: string; reason: string }>
    projects: Array<{ id: number; match: string; reason: string }>
    empty?: boolean
  } | null>(null)
  const [matchingMaterials, setMatchingMaterials] = useState(false)
  const [matchError, setMatchError] = useState("")
  const [addedExp, setAddedExp] = useState<Set<string>>(new Set())

  const [applications, setApplications] = useState<Application[]>([])
  const [linkedAppId, setLinkedAppId] = useState<string>("")

  const searchParams = useSearchParams()

  // 从历史版本还原当时的对比界面
  const restoreVersion = async (versionId: number) => {
    try {
      const versions = await api.resume.getVersions()
      const v = versions.find(x => x.id === versionId)
      if (!v) return
      if (v.analysis_json) {
        try { setInterviewerAnalysis(JSON.parse(v.analysis_json)) } catch {}
      }
      if (v.application_id) setLinkedAppId(String(v.application_id))
      // 优先用完整快照 1:1 还原双栏对比
      if (v.snapshot_json) {
        try {
          const snap = JSON.parse(v.snapshot_json)
          if (snap.result) setResult(snap.result)
          if (snap.jdText) setJdText(snap.jdText)
          if (snap.company) setCompany(snap.company)
          if (snap.position) setPosition(snap.position)
          if (snap.mode) setMode(snap.mode === "deep" ? "deep" : "light")
          if (snap.jdProfile) setJdProfile(snap.jdProfile)
          if (typeof snap.originalWordCount === "number") setOriginalWordCount(snap.originalWordCount)
          if (typeof snap.rewrittenWordCount === "number") setRewrittenWordCount(snap.rewrittenWordCount)
          setVersionSaved(true)
          return
        } catch {}
      }
      // 降级：早期版本无快照，用保存的正文做只读展示
      if (v.content) {
        setResult({ internships: [], projects: [], skills: [], actions: [], raw: v.content, mode: "", temperature: 0 })
        if (v.target_role) setPosition(v.target_role)
        setVersionSaved(true)
      }
    } catch {}
  }

  // 读取从投递看板或首页跳转过来的 URL 参数
  useEffect(() => {
    const c = searchParams.get("company")
    const p = searchParams.get("position")
    const a = searchParams.get("app_id")
    const v = searchParams.get("version_id")
    if (c) setCompany(c)
    if (p) setPosition(p)
    if (a) setLinkedAppId(a)
    // 如果有 version_id 参数，跳到 step 3 并还原当时的对比界面
    if (v) {
      setStep(3)
      restoreVersion(Number(v))
    }
  }, [])  // eslint-disable-line

  // step 3 时加载投递列表
  useEffect(() => {
    if (step === 3) {
      api.applications.getAll().then(setApplications).catch(() => {})
    }
  }, [step])

  // company 填写后自动匹配投递记录
  useEffect(() => {
    if (!company || applications.length === 0 || linkedAppId) return
    const match = applications.find(a =>
      a.company.includes(company) || company.includes(a.company)
    )
    if (match) setLinkedAppId(String(match.id))
  }, [company, applications])

  const runInterviewerAnalysis = async () => {
    setLoadingAnalysis(true)
    setAnalysisError("")
    try {
      const rewrittenText = [
        ...(result?.internships?.map(i => `${i.company} ${i.position}\n${i.rewritten}`) || []),
        ...(result?.projects?.map(p => `${p.name}\n${p.rewritten}`) || []),
      ].join("\n\n") || result?.raw || ""
      const resp = await fetch(`${API}/api/v1/ai/interviewer-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: rewrittenText, jd_text: jdText, company, position }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || "分析失败")
      setInterviewerAnalysis(data)
    } catch (e: any) {
      setAnalysisError(e.message || "分析失败，请检查API Key配置")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const autoSyncToTracker = async (companyVal: string, positionVal: string): Promise<number | null> => {
    if (!companyVal.trim() || autoSynced) return null
    try {
      const today = new Date().toISOString().slice(0, 10)
      const app = await api.applications.create({
        company: companyVal,
        position: positionVal || "产品经理",
        tier: "匹配",
        status: "意向",
        applied_date: today,
        source: "简历工作台",
        contact: "",
        notes: jdText ? `JD摘要：${jdText.slice(0, 100)}` : "",
        jd_url: "",
      })
      setAutoSynced(true)
      return app.id
    } catch { return null }
  }

  const syncJDAnalysis = async (appId: number) => {
    if (!jdText.trim() || !resumeText.trim()) return
    try {
      const resp = await fetch(`${API}/api/v1/ai/jd-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, company, position }),
      })
      const data = await resp.json()
      if (!resp.ok || data.raw) return
      await api.applications.saveJDAnalysis(appId, {
        jd_score: data.overall_score ?? 0,
        jd_summary: data.summary ?? "",
      })
    } catch { }
  }

  const handleResumeChange = (text: string) => {
    setResumeText(text)
    setOriginalWordCount(text.trim().length)
    setLibSynced(false)
  }

  const syncToLibrary = async (text: string) => {
    if (libSynced || !text.trim()) return
    setLibSynced(true)
    try {
      const resp = await fetch(`${API}/api/v1/resume/parse-and-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: text }),
      })
      const data = await resp.json()
      if (!resp.ok || data.error) return
      const { added_internships: ai, added_projects: ap, added_skills: as_ } = data
      if (ai + ap + as_ > 0) {
        const parts = [
          ai > 0 && `${ai} 段实习`,
          ap > 0 && `${ap} 个项目`,
          as_ > 0 && `${as_} 项技能`,
        ].filter(Boolean).join(" · ")
        setLibToast(`已同步到素材库：${parts}`)
        setTimeout(() => setLibToast(null), 5000)
      }
    } catch {}
  }

  const calcRewrittenCount = (r: RewriteResult | null): number => {
    if (!r) return 0
    if (r.raw) return r.raw.trim().length
    const parts = [
      ...(r.internships?.map(i => i.rewritten) || []),
      ...(r.projects?.map(p => p.rewritten) || []),
    ]
    return parts.join("").trim().length
  }

  const generate = async () => {
    if (!resumeText.trim()) return setError("请先填写简历内容")
    setLoading(true)
    setError("")
    setRewrittenWordCount(null)
    try {
      const resp = await fetch(`${API}/api/v1/resume/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, mode }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || "生成失败")
      setResult(data)
      setRewrittenWordCount(calcRewrittenCount(data))
      setVersionSaved(false)
      setStep(3)
      persistTagMatch()
      if (company.trim() && !autoSynced) {
        const appId = await autoSyncToTracker(company, position)
        if (appId) syncJDAnalysis(appId)
      }
    } catch (e: any) {
      setError(e.message || "生成失败")
    } finally {
      setLoading(false)
    }
  }

  // 后台跑「JD 需求标签 × 我的标签」匹配,结果写 localStorage 供首页能力胶囊右列「所需能力」
  // (失败静默,不阻塞主流程;改写或解读 JD 时都会触发,最近一次覆盖)
  const persistTagMatch = () => {
    if (!jdText.trim()) return
    api.ai.tagMatch({ jd_text: jdText, company, position })
      .then(res => {
        if (!res.empty) {
          localStorage.setItem("jobpilot_last_tagmatch", JSON.stringify({ jd_tags: res.jd_tags, my_tags: res.my_tags }))
        }
      })
      .catch(() => { /* 标签匹配失败不影响主流程 */ })
  }

  const analyzeJD = async () => {
    if (!jdText.trim()) return
    setAnalyzingJd(true)
    setJdProfileError("")
    try {
      const data = await api.ai.jdProfile({ jd_text: jdText, company, position })
      setJdProfile(data)
      persistTagMatch()
    } catch (e: any) {
      setJdProfileError(e.message || "解析失败，请检查 API Key 配置")
    } finally {
      setAnalyzingJd(false)
    }
  }

  // 进入 Step2 拉取素材库（用于按 id 还原经历详情 + 拼接文本）
  useEffect(() => {
    if (step === 2 && libInterns.length === 0 && libProjects.length === 0) {
      Promise.all([api.profile.getInternships(), api.profile.getProjects()])
        .then(([i, p]) => { setLibInterns(i); setLibProjects(p) })
        .catch(() => {})
    }
  }, [step])  // eslint-disable-line

  const runMatchMaterials = async () => {
    if (!jdText.trim()) return
    setMatchingMaterials(true)
    setMatchError("")
    try {
      const data = await api.ai.matchMaterials({ jd_text: jdText, company, position })
      setMatchResult(data)
    } catch (e: any) {
      setMatchError(e.message || "推荐失败，请检查 API Key 配置")
    } finally {
      setMatchingMaterials(false)
    }
  }

  const addExperienceToResume = (text: string, key: string) => {
    const next = resumeText.trim() ? `${resumeText}\n\n${text}` : text
    handleResumeChange(next)
    setAddedExp(prev => new Set(prev).add(key))
  }

  const buildRewrittenResume = (): string => {
    if (!result) return ""
    if (result.raw) return result.raw
    const lines: string[] = []
    result.internships?.forEach(item => {
      lines.push(`${item.company} - ${item.position}`)
      lines.push(item.rewritten)
      lines.push("")
    })
    result.projects?.forEach(item => {
      lines.push(item.name)
      lines.push(item.rewritten)
      lines.push("")
    })
    return lines.join("\n")
  }

  const saveVersion = async () => {
    if (!result) return
    setSavingVersion(true)
    try {
      const label = company ? `${company}-${position || "产品经理"}` : "通用版"
      const snapshot = {
        result,
        jdText,
        company,
        position,
        mode,
        jdProfile,
        originalWordCount,
        rewrittenWordCount,
      }
      await api.resume.saveVersion({
        version_name: `${label}（${mode === "light" ? "轻修" : "精修"}）`,
        content: buildRewrittenResume(),
        target_role: position || "产品经理",
        analysis_json: interviewerAnalysis ? JSON.stringify(interviewerAnalysis) : undefined,
        snapshot_json: JSON.stringify(snapshot),
        application_id: linkedAppId ? Number(linkedAppId) : undefined,
      })
      setVersionSaved(true)
      setVersionsKey(k => k + 1)
    } catch (e: any) {
      setError(e.message || "保存失败")
    } finally {
      setSavingVersion(false)
    }
  }

  const exportToPDF = () => {
    if (!result) return
    const title = company ? `${company}${position ? `-${position}` : ""}` : "简历改写结果"
    const internHtml = (result.internships || []).map(item => `
      <div class="section">
        <div class="section-title">实习经历 · ${item.company}${item.position ? " · " + item.position : ""}</div>
        <div class="content">${item.rewritten.replace(/\n/g, "<br/>")}</div>
      </div>`).join("")
    const projectHtml = (result.projects || []).map(item => `
      <div class="section">
        <div class="section-title">项目经历 · ${item.name}</div>
        <div class="content">${item.rewritten.replace(/\n/g, "<br/>")}</div>
      </div>`).join("")
    const skillHtml = (result.skills || []).length > 0 ? `
      <div class="section">
        <div class="section-title">技能</div>
        <div class="content">${result.skills.map(s => s.after).join(" / ")}</div>
      </div>` : ""
    const rawHtml = result.raw ? `<div class="content" style="white-space:pre-wrap">${result.raw}</div>` : ""
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:32px 48px;color:#1a1a1a;font-size:13px;line-height:1.8}
        h1{font-size:16px;font-weight:700;margin-bottom:4px;border-bottom:2px solid #e07b39;padding-bottom:6px}
        .meta{font-size:11px;color:#888;margin-bottom:24px}
        .section{margin-bottom:18px}
        .section-title{font-weight:700;font-size:12px;color:#e07b39;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
        .content{color:#333;font-size:13px}
        @media print{body{padding:16px 24px}@page{margin:15mm}}
      </style>
    </head><body>
      <h1>${title}</h1>
      <div class="meta">由 JobPilot AI 改写 · ${mode === "light" ? "轻修" : "精修"}模式</div>
      ${rawHtml || (internHtml + projectHtml + skillHtml)}
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close() }
  }

  const inputCls = "w-full border border-[var(--border)] bg-[var(--surface2)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 素材库同步 toast */}
      {libToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a1a] text-white text-sm px-5 py-3 rounded-full shadow-xl animate-fade-in">
          <span>📦</span>
          <span>{libToast}</span>
          <Link href="/profile" className="text-amber-300 hover:text-amber-200 font-medium whitespace-nowrap">查看素材库 →</Link>
          <button onClick={() => setLibToast(null)} className="text-white/50 hover:text-white ml-1">×</button>
        </div>
      )}
      <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">简历工作台</h1>
      <p className="text-xs text-[var(--text-muted)] mb-6">拖拽上传简历 → 粘贴 JD（支持截图）→ 左右对比查看 AI 改写结果</p>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: "上传简历" },
          { num: 2, label: "输入 JD" },
          { num: 3, label: "对比改写" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => step > s.num && setStep(s.num as 1|2|3)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                step === s.num
                  ? "bg-[var(--primary)] text-white font-semibold"
                  : step > s.num
                  ? "bg-[var(--surface2)] text-[var(--text-sub)] cursor-pointer hover:bg-[var(--border)]"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                step === s.num ? "bg-white text-[var(--primary)]" :
                step > s.num  ? "bg-[var(--primary)] text-white" :
                "bg-[var(--border)] text-[var(--text-muted)]"
              }`}>{step > s.num ? "✓" : s.num}</span>
              {s.label}
            </button>
            {idx < 2 && <span className="text-[var(--border)] text-sm">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1：上传简历 */}
      {step === 1 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          {/* 来源 tab 切换 */}
          <div className="flex gap-1 mb-4 bg-[var(--surface2)] rounded-lg p-1 w-fit">
            {([["upload", "📄 粘贴 / 上传"], ["library", "📦 从素材库导入"]] as const).map(([key, label]) => (
              <button key={key}
                onClick={() => setStep1Mode(key)}
                className={`px-4 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  step1Mode === key
                    ? "bg-[var(--surface)] text-[var(--text-main)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {step1Mode === "upload" ? (
            <ResumeDropZone value={resumeText} onChange={handleResumeChange} />
          ) : (
            <MaterialImporter onImport={text => { handleResumeChange(text); setStep1Mode("upload") }} />
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-[var(--text-muted)] space-y-0.5">
              <p>支持 PDF / Word / TXT 拖拽上传，也可直接在框内粘贴文字</p>
              <p>建议上传文字版 PDF（扫描件可能无法提取文字）</p>
            </div>
            <button
              onClick={() => { if (resumeText.trim()) { setStep(2); syncToLibrary(resumeText) } }}
              disabled={!resumeText.trim()}
              className="px-5 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 2：输入 JD */}
      {step === 2 && (
        <div data-shot="jd" className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">目标公司</label>
              <input value={company} onChange={e => setCompany(e.target.value)}
                placeholder="如：字节跳动" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">目标岗位</label>
              <input value={position} onChange={e => setPosition(e.target.value)}
                placeholder="如：B端产品经理" className={inputCls} />
            </div>
          </div>

          {company.trim() && (
            <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700">生成后将自动同步到投递看板（{company} · {position || "产品经理"}）</span>
            </div>
          )}

          <JDTextArea value={jdText} onChange={v => { setJdText(v); setJdProfile(null) }} />

          {/* JD 人才画像分析 */}
          {jdText.trim().length > 80 && !jdProfile && (
            <div className="flex items-center gap-3">
              <button onClick={analyzeJD} disabled={analyzingJd}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60">
                {analyzingJd ? (
                  <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>解读中...</>
                ) : "🔍 解读这份JD（先看清楚招什么人，再改简历）"}
              </button>
              {jdProfileError && <p className="text-xs text-red-500">{jdProfileError}</p>}
            </div>
          )}

          {jdProfile && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">{jdProfile.pm_type}</span>
                  <span className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-xs rounded-full">{jdProfile.experience_level}</span>
                </div>
                <button onClick={() => setJdProfile(null)} className="text-[10px] text-indigo-400 hover:text-indigo-600 shrink-0">关闭</button>
              </div>

              {/* 核心能力维度（精简版：只显示核心+重要） */}
              <div className="flex flex-wrap gap-1.5">
                {jdProfile.key_dimensions
                  .filter(d => d.priority === "核心" || d.priority === "重要")
                  .map((d, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.priority === "核心" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{d.name}</span>
                  ))}
              </div>

              {/* 改写重点 */}
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0">💡</span>
                <p className="text-xs text-indigo-800 font-medium">{jdProfile.rewrite_focus}</p>
              </div>
            </div>
          )}

          {/* JD → 素材库经历匹配推荐 */}
          {jdText.trim().length > 80 && (
            <div className="space-y-2">
              {!matchResult && (
                <button onClick={runMatchMaterials} disabled={matchingMaterials}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60">
                  {matchingMaterials ? (
                    <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>匹配中...</>
                  ) : "🎯 推荐匹配经历（从素材库挑出最适合这份JD的经历）"}
                </button>
              )}
              {matchError && <p className="text-xs text-red-500">{matchError}</p>}

              {matchResult && matchResult.empty && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-[var(--text-main)]">素材库还没有经历可推荐</p>
                  <p className="text-xs text-[var(--text-muted)]">先去添加实习 / 项目经历，下次粘 JD 就能自动推荐最匹配的经历</p>
                  <Link href="/profile" className="inline-block mt-1 px-4 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg font-medium hover:opacity-90 transition-opacity">去建立素材库 →</Link>
                </div>
              )}

              {matchResult && !matchResult.empty && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-700">🎯 匹配经历推荐（按匹配度排序）</p>
                    <button onClick={() => { setMatchResult(null); setAddedExp(new Set()) }} className="text-[10px] text-emerald-500 hover:text-emerald-700 shrink-0">重新推荐</button>
                  </div>

                  {matchResult.internships.map(rec => {
                    const exp = libInterns.find(i => i.id === rec.id)
                    if (!exp) return null
                    const key = "i-" + rec.id
                    const added = addedExp.has(key)
                    return (
                      <div key={key} className="bg-white border border-emerald-100 rounded-lg px-3 py-2.5 flex items-start gap-3">
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${rec.match === "高" ? "bg-red-100 text-red-700" : rec.match === "中" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{rec.match}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-main)]">实习 · {exp.company} · {exp.position}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{rec.reason}</p>
                        </div>
                        <button onClick={() => addExperienceToResume(internToText(exp), key)} disabled={added}
                          className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${added ? "text-green-600" : "bg-[var(--primary)] text-white hover:opacity-90"}`}>
                          {added ? "已加入 ✓" : "＋ 加入简历"}
                        </button>
                      </div>
                    )
                  })}

                  {matchResult.projects.map(rec => {
                    const exp = libProjects.find(p => p.id === rec.id)
                    if (!exp) return null
                    const key = "p-" + rec.id
                    const added = addedExp.has(key)
                    return (
                      <div key={key} className="bg-white border border-emerald-100 rounded-lg px-3 py-2.5 flex items-start gap-3">
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${rec.match === "高" ? "bg-red-100 text-red-700" : rec.match === "中" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{rec.match}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-main)]">项目 · {exp.name} · {exp.role}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{rec.reason}</p>
                        </div>
                        <button onClick={() => addExperienceToResume(projectToText(exp), key)} disabled={added}
                          className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${added ? "text-green-600" : "bg-[var(--primary)] text-white hover:opacity-90"}`}>
                          {added ? "已加入 ✓" : "＋ 加入简历"}
                        </button>
                      </div>
                    )
                  })}

                  <p className="text-[10px] text-[var(--text-muted)] pt-1">「加入简历」会把该段经历追加到 Step1 的简历内容，改写时一并处理</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">如何粘贴 JD 截图？</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>在浏览器/APP中对JD页面截图（Win: <kbd className="bg-blue-100 px-1 rounded">Win+Shift+S</kbd>，Mac: <kbd className="bg-blue-100 px-1 rounded">Cmd+Shift+4</kbd>）</li>
              <li>点击上方JD输入框，按 <kbd className="bg-blue-100 px-1 rounded">Ctrl+V</kbd> / <kbd className="bg-blue-100 px-1 rounded">Cmd+V</kbd> 粘贴</li>
              <li>AI 自动识别截图中的文字并填入（需配置支持图片识别的模型）</li>
            </ol>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[var(--text-sub)]">改写力度：</span>
            {[
              { key: "light" as const, label: "轻修", desc: "优化表达，保留原风格" },
              { key: "deep"  as const, label: "精修", desc: "结果先行 + 压缩STAR，大幅重构" },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)} title={m.desc}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
                  mode === m.key
                    ? "bg-[var(--primary-bg)] border-[var(--primary)] text-[var(--primary)] font-medium"
                    : "bg-[var(--surface2)] border-transparent text-[var(--text-sub)] hover:bg-[var(--border)]"
                }`}>
                {m.label}
                <span className="text-xs ml-1 opacity-60 hidden sm:inline">（{m.desc}）</span>
              </button>
            ))}

            <button onClick={generate} disabled={loading}
              className="ml-auto px-6 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  AI 改写中...
                </>
              ) : "生成改写结果"}
            </button>
          </div>

          {/* 改写方法论说明 */}
          <div className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-lg px-4 py-3 space-y-1.5">
            <p className="font-semibold text-[var(--text-sub)]">改写逻辑说明</p>
            <p>
              <span className="font-medium text-[var(--text-main)]">总领句结果先行</span>
              ：HR 筛简历时只扫第一句话，「完成了什么」比「负责了什么」更有说服力。把交付物和覆盖范围放到句首，而不是动词。
            </p>
            <p>
              <span className="font-medium text-[var(--text-main)]">要点加一句背景</span>
              ：说明你在解决什么问题，让每段经历有独特性，避免「换个名字也能贴」的空洞描述。这是 STAR 里 Situation 的压缩版。
            </p>
            <p className="text-[var(--text-muted)]">
              完整 STAR 方法写下来需要 100+ 字，简历版面放不下。这里取「背景一句 + 行动 + 结果」的精简结构，保留逻辑链条的同时适配快速筛选场景。
            </p>
          </div>
        </div>
      )}

      {/* Step 3：双栏对比 */}
      {step === 3 && (
        <div className="space-y-4">
          {/* 顶部状态栏 */}
          <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--text-main)]">
                {company || "通用版"}{position ? ` · ${position}` : ""}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                mode === "light" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
              }`}>
                {mode === "light" ? "轻修" : "精修"}
              </span>
              {autoSynced && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span>✓</span> 已同步到投递看板
                  <a href="/tracker" className="underline hover:no-underline ml-1">查看</a>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* 关联投递选择器 */}
              {applications.length > 0 && !versionSaved && (
                <select value={linkedAppId} onChange={e => setLinkedAppId(e.target.value)}
                  className="text-xs border border-[var(--border)] bg-[var(--surface2)] text-[var(--text-sub)] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--primary)] max-w-[160px]">
                  <option value="">不关联（通用版）</option>
                  {applications.map(a => (
                    <option key={a.id} value={a.id}>{a.company} · {a.position}</option>
                  ))}
                </select>
              )}
              {versionSaved ? (
                <span className="text-xs text-green-600 font-medium">
                  已保存 ✓{linkedAppId && applications.find(a => a.id === Number(linkedAppId)) &&
                    ` → ${applications.find(a => a.id === Number(linkedAppId))!.company}`}
                </span>
              ) : (
                <button onClick={saveVersion} disabled={savingVersion}
                  className="px-3 py-1.5 text-xs border border-[var(--border)] text-[var(--text-sub)] rounded-lg hover:bg-[var(--surface2)] transition-colors disabled:opacity-60">
                  {savingVersion ? "保存中..." : "保存版本"}
                </button>
              )}
              <button
                onClick={() => { setStep(2); setResult(null); setVersionSaved(false); setAutoSynced(false); setJdProfile(null) }}
                className="px-3 py-1.5 text-xs border border-[var(--border)] text-[var(--text-sub)] rounded-lg hover:bg-[var(--surface2)] transition-colors">
                换一家公司
              </button>
            </div>
          </div>

          {/* 双栏对比 */}
          {result?.raw ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">改写结果</p>
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-main)] leading-relaxed">{result.raw}</pre>
            </div>
          ) : (
            <div className="space-y-4">
              {result?.internships?.map((item, i) => (
                <div key={i} data-shot="compare" className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-5 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)] flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">实习经历</span>
                    <span className="text-sm font-semibold text-[var(--text-main)]">{item.company}</span>
                    {item.position && <span className="text-xs text-[var(--text-muted)]">· {item.position}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80px]">
                    <div className="p-4 border-r border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] inline-block"/> 原始简历
                      </p>
                      <p className="text-sm text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">{item.original}</p>
                    </div>
                    <div className="p-4 bg-[#FFFDF9]">
                      <p className="text-xs text-[var(--primary)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] inline-block"/> 改写结果
                      </p>
                      <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                        {diffHighlight(item.original, item.rewritten)}
                      </p>
                      {item.note && (
                        <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)] italic">
                          💡 {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {result?.projects?.map((item, i) => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-5 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)] flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">项目经历</span>
                    <span className="text-sm font-semibold text-[var(--text-main)]">{item.name}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80px]">
                    <div className="p-4 border-r border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] inline-block"/> 原始简历
                      </p>
                      <p className="text-sm text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">{item.original}</p>
                    </div>
                    <div className="p-4 bg-[#FFFDF9]">
                      <p className="text-xs text-[var(--primary)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] inline-block"/> 改写结果
                      </p>
                      <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                        {diffHighlight(item.original, item.rewritten)}
                      </p>
                      {item.note && (
                        <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)] italic">
                          💡 {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {result?.skills && result.skills.length > 0 && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-5 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)]">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">技能优化</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="p-4 border-r border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] inline-block"/> 原始
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.skills.map((s, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-[var(--surface2)] text-[var(--text-sub)] rounded-full line-through opacity-60">
                            {s.before}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-[#FFFDF9]">
                      <p className="text-xs text-[var(--primary)] font-medium mb-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] inline-block"/> 优化后
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.skills.map((s, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-900 rounded-full font-medium border border-yellow-200">
                            {s.after}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result?.actions && result.actions.length > 0 && (
                <div className="bg-[var(--primary-bg)] border border-[var(--primary)]/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-3">AI 改写建议</p>
                  <ul className="space-y-1.5">
                    {result.actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                        <span className="text-[var(--primary)] shrink-0 font-bold mt-0.5">·</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 面试官视角分析 */}
              <div data-shot="score" className="bg-[var(--surface)] border-2 border-indigo-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-900">面试官视角分析</h3>
                    <p className="text-xs text-indigo-500 mt-0.5">AI 扮演面试官，找出简历薄弱点和可能被追问的地方</p>
                  </div>
                  {!interviewerAnalysis && (
                    <button onClick={runInterviewerAnalysis} disabled={loadingAnalysis}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1.5 shrink-0">
                      {loadingAnalysis ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          分析中...
                        </>
                      ) : "开始分析"}
                    </button>
                  )}
                  {interviewerAnalysis && (
                    <button onClick={() => setInterviewerAnalysis(null)} className="text-xs text-indigo-400 hover:text-indigo-600">重新分析</button>
                  )}
                </div>

                {!interviewerAnalysis && !loadingAnalysis && (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      {jdText.trim() ? "点击「开始分析」，AI 将对照 JD 找出薄弱点和可能被追问的地方" : "建议先在 Step2 填写 JD，分析结果会更精准"}
                    </p>
                    {analysisError && <p className="text-xs text-red-600 mt-2">{analysisError}</p>}
                  </div>
                )}

                {interviewerAnalysis && (
                  <div className="p-5 space-y-5">
                    {interviewerAnalysis.raw ? (
                      <pre className="whitespace-pre-wrap text-sm text-[var(--text-main)] leading-relaxed">{interviewerAnalysis.raw}</pre>
                    ) : (
                      <>
                        {/* 评分 + 透明化说明 */}
                        <div className="bg-[var(--surface2)] rounded-xl p-4">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="text-center">
                              <div className={`text-3xl font-bold leading-none ${
                                interviewerAnalysis.overall_score >= 80 ? "text-green-600" :
                                interviewerAnalysis.overall_score >= 65 ? "text-amber-600" :
                                interviewerAnalysis.overall_score >= 50 ? "text-orange-600" : "text-red-600"
                              }`}>
                                {interviewerAnalysis.overall_score}
                              </div>
                              <div className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded ${
                                interviewerAnalysis.overall_score >= 80 ? "bg-green-100 text-green-700" :
                                interviewerAnalysis.overall_score >= 65 ? "bg-amber-100 text-amber-700" :
                                interviewerAnalysis.overall_score >= 50 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                              }`}>
                                {interviewerAnalysis.overall_score >= 80 ? "优秀" :
                                 interviewerAnalysis.overall_score >= 65 ? "良好" :
                                 interviewerAnalysis.overall_score >= 50 ? "合格" : "待提升"}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-[var(--text-main)] leading-relaxed">{interviewerAnalysis.summary}</p>
                            </div>
                          </div>
                          {/* 评分依据 */}
                          <div className="border-t border-[var(--border)] pt-2.5">
                            <p className="text-[10px] text-[var(--text-muted)] mb-1.5 font-medium">评分依据</p>
                            <div className="flex items-center gap-3 flex-wrap text-[10px]">
                              {(() => {
                                const strong  = interviewerAnalysis.match_items?.filter(i => i.resume_status === "strong").length  ?? 0
                                const weak    = interviewerAnalysis.match_items?.filter(i => i.resume_status === "weak").length    ?? 0
                                const missing = interviewerAnalysis.match_items?.filter(i => i.resume_status === "missing").length ?? 0
                                return <>
                                  <span className="flex items-center gap-1"><span className="text-green-600 font-bold">✅ {strong}</span><span className="text-[var(--text-muted)]">项命中</span></span>
                                  <span className="flex items-center gap-1"><span className="text-amber-600 font-bold">⚠️ {weak}</span><span className="text-[var(--text-muted)]">项较弱</span></span>
                                  <span className="flex items-center gap-1"><span className="text-red-500 font-bold">❌ {missing}</span><span className="text-[var(--text-muted)]">项缺失</span></span>
                                  <span className="text-[var(--text-muted)] border-l border-[var(--border)] pl-3">基于JD核心维度覆盖率综合计算</span>
                                </>
                              })()}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                              <span className="bg-green-100 text-green-700 px-1 rounded">80+优秀</span>
                              <span className="text-[var(--border)]">·</span>
                              <span className="bg-amber-100 text-amber-700 px-1 rounded">65–79良好</span>
                              <span className="text-[var(--border)]">·</span>
                              <span className="bg-orange-100 text-orange-700 px-1 rounded">50–64合格</span>
                              <span className="text-[var(--border)]">·</span>
                              <span className="bg-red-100 text-red-700 px-1 rounded">&lt;50待提升</span>
                            </div>
                          </div>
                        </div>

                        {interviewerAnalysis.match_items?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">JD 能力命中</p>
                            <div className="space-y-2">
                              {interviewerAnalysis.match_items.map((item, i) => (
                                <div key={i} className={`rounded-lg px-3 py-2.5 border ${
                                  item.resume_status === "strong" ? "bg-green-50 border-green-200" :
                                  item.resume_status === "weak"   ? "bg-amber-50 border-amber-200" :
                                                                     "bg-red-50 border-red-200"
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">{item.resume_status === "strong" ? "✅" : item.resume_status === "weak" ? "⚠️" : "❌"}</span>
                                    <span className="text-sm font-semibold text-[var(--text-main)]">{item.aspect}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-auto ${
                                      item.resume_status === "strong" ? "bg-green-100 text-green-700" :
                                      item.resume_status === "weak"   ? "bg-amber-100 text-amber-700" :
                                                                         "bg-red-100 text-red-700"
                                    }`}>
                                      {item.resume_status === "strong" ? "命中" : item.resume_status === "weak" ? "较弱" : "缺失"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--text-muted)]">JD要求：{item.jd_requirement}</p>
                                  {item.suggestion && (
                                    <p className="text-xs text-[var(--text-sub)] mt-1">→ {item.suggestion}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {interviewerAnalysis.follow_up_questions?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">追问预警</p>
                            <div className="space-y-2">
                              {interviewerAnalysis.follow_up_questions.map((q, i) => (
                                <div key={i} className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3">
                                  <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">简历原文：<span className="text-[var(--text-sub)]">「{q.bullet}」</span></p>
                                  <p className="text-sm text-[var(--text-main)] mb-1">面试官可能追问：<strong>{q.question}</strong></p>
                                  <p className={`text-xs font-medium ${q.can_answer ? "text-green-600" : "text-red-600"}`}>
                                    {q.can_answer ? "✓ 你的简历可以支撑这个回答" : "⚠ 你的简历目前无法支撑这个回答，建议补充"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(interviewerAnalysis.weak_signals?.length > 0 || interviewerAnalysis.strong_signals?.length > 0) && (
                          <div className="grid grid-cols-2 gap-3">
                            {interviewerAnalysis.strong_signals?.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-green-600 mb-2">强信号词（保留）</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {interviewerAnalysis.strong_signals.map((s, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {interviewerAnalysis.weak_signals?.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-600 mb-2">空话/弱信号词（考虑删除）</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {interviewerAnalysis.weak_signals.map((s, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 line-through">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 历史版本面板 */}
          <VersionHistoryPanel 
            refreshKey={versionsKey} 
            autoExpandVersionId={searchParams.get("version_id") ? Number(searchParams.get("version_id")) : undefined}
          />
        </div>
      )}
    </div>
  )
}

export default function ResumePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 text-sm text-[var(--text-muted)]">加载中...</div>}>
      <ResumePageInner />
    </Suspense>
  )
}
