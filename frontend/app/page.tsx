"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  api,
  JdTag,
  MyTag,
  ProfileInternship,
  ProfileProject,
  ProfileSkill,
  ResumeVersion,
} from "@/lib/api"
import { SHEET_GRID, SheetCode } from "@/components/blueprint"

type MaterialKey = `internship-${number}` | `project-${number}`

function internToText(i: ProfileInternship): string {
  const date = i.start_date ? ` | ${i.start_date} - ${i.is_current ? "至今" : i.end_date || "至今"}` : ""
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

function composeBaseResume(
  raw: string,
  internships: ProfileInternship[],
  projects: ProfileProject[],
  skills: ProfileSkill[],
  selected: Set<MaterialKey>,
  includeSkills: boolean
) {
  const blocks: string[] = []
  if (raw.trim()) blocks.push(raw.trim())

  const chosenInterns = internships.filter(i => selected.has(`internship-${i.id}`))
  if (chosenInterns.length) {
    blocks.push(["【实习经历】", ...chosenInterns.flatMap(i => [internToText(i), ""])].join("\n").trim())
  }

  const chosenProjects = projects.filter(p => selected.has(`project-${p.id}`))
  if (chosenProjects.length) {
    blocks.push(["【项目经历】", ...chosenProjects.flatMap(p => [projectToText(p), ""])].join("\n").trim())
  }

  if (includeSkills && skills.length) {
    const grouped = skills.reduce((acc, s) => {
      if (!s.skill_name) return acc
      acc[s.category || "技能"] = acc[s.category || "技能"] || []
      acc[s.category || "技能"].push(s.skill_name)
      return acc
    }, {} as Record<string, string[]>)
    const skillLines = Object.entries(grouped).map(([cat, items]) => `${cat}：${items.join(" / ")}`)
    if (skillLines.length) blocks.push(["【技能】", ...skillLines].join("\n"))
  }

  return blocks.join("\n\n").trim()
}

function parseScore(json?: string): number | null {
  if (!json) return null
  try {
    return JSON.parse(json)?.overall_score ?? null
  } catch {
    return null
  }
}

function formatDate(date?: string) {
  if (!date) return ""
  return date.slice(0, 10)
}

function SectionHeading({ code, title, right }: { code: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <SheetCode>{code}</SheetCode>
        <h2 className="text-sm font-bold text-[var(--text-main)] font-cartoon">{title}</h2>
      </div>
      {right}
    </div>
  )
}

function WorkCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>
      <div className="pointer-events-none absolute inset-0" style={SHEET_GRID} />
      <div className="relative flex h-full min-h-0 flex-col">{children}</div>
    </div>
  )
}

function MaterialToggle({
  checked,
  title,
  sub,
  type,
  onClick,
}: {
  checked: boolean
  title: string
  sub: string
  type: "实习" | "项目"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        checked
          ? "border-[var(--primary)] bg-white"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/35"
      }`}
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
        checked ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] text-transparent"
      }`}>
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-[var(--text-main)]">{title}</span>
          <span className="shrink-0 rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 text-xs text-[var(--text-sub)]">{type}</span>
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--text-muted)]">{sub || "暂无描述"}</span>
      </span>
    </button>
  )
}

function TagPill({ tag }: { tag: MyTag | JdTag }) {
  const status = "status" in tag ? tag.status : tag.strength
  const cls =
    status === "缺口" ? "bg-[#F1E0DA] text-[#9E4631]" :
    status === "部分" ? "bg-[#F2E9D6] text-[#876426]" :
    status === "命中" || status === "强" ? "bg-[#E3EDE3] text-[#3C6B4E]" :
    "border border-[var(--border)] bg-white text-[var(--text-sub)]"
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${cls}`}>
      {tag.label}
      <span className="opacity-70">{status}</span>
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [resumeText, setResumeText] = useState("")
  const [jdText, setJdText] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [uploading, setUploading] = useState(false)

  const [internships, setInternships] = useState<ProfileInternship[]>([])
  const [projects, setProjects] = useState<ProfileProject[]>([])
  const [skills, setSkills] = useState<ProfileSkill[]>([])
  const [selected, setSelected] = useState<Set<MaterialKey>>(new Set())
  const [includeSkills, setIncludeSkills] = useState(true)
  const [versions, setVersions] = useState<ResumeVersion[]>([])
  const [myTags, setMyTags] = useState<MyTag[]>([])
  const [jdTags, setJdTags] = useState<JdTag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      setResumeText(localStorage.getItem("jobpilot_home_resume_draft") || "")
      setJdText(localStorage.getItem("jobpilot_home_jd_draft") || "")
      const cachedMatch = localStorage.getItem("jobpilot_last_tagmatch")
      if (cachedMatch) {
        const parsed = JSON.parse(cachedMatch)
        setJdTags(parsed.jd_tags || [])
      }
    } catch {}

    Promise.all([
      api.profile.getInternships().catch(() => []),
      api.profile.getProjects().catch(() => []),
      api.profile.getSkills().catch(() => []),
      api.resume.getVersions().catch(() => []),
      api.ai.myTags().catch(() => ({ my_tags: [] })),
    ]).then(([i, p, s, v, tags]) => {
      setInternships(i)
      setProjects(p)
      setSkills(s)
      setVersions(v)
      setMyTags(tags.my_tags || [])
      setSelected(new Set<MaterialKey>([
        ...i.slice(0, 3).map(item => `internship-${item.id}` as MaterialKey),
        ...p.slice(0, 3).map(item => `project-${item.id}` as MaterialKey),
      ]))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    try { localStorage.setItem("jobpilot_home_resume_draft", resumeText) } catch {}
  }, [resumeText])

  useEffect(() => {
    try { localStorage.setItem("jobpilot_home_jd_draft", jdText) } catch {}
  }, [jdText])

  const baseResume = useMemo(
    () => composeBaseResume(resumeText, internships, projects, skills, selected, includeSkills),
    [resumeText, internships, projects, skills, selected, includeSkills]
  )

  const selectedCount = selected.size + (includeSkills && skills.length ? 1 : 0)
  const charCount = baseResume.length
  const latestVersion = versions[0]

  const toggleMaterial = (key: MaterialKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await api.resume.upload(file)
      setResumeText(res.text)
    } catch (e: any) {
      alert(e.message || "文件上传失败")
    } finally {
      setUploading(false)
    }
  }

  const beginMatch = () => {
    try {
      localStorage.setItem("jobpilot_prefill_resume", baseResume)
      localStorage.setItem("jobpilot_prefill_jd", jdText)
      localStorage.setItem("jobpilot_prefill_company", company)
      localStorage.setItem("jobpilot_prefill_position", position)
    } catch {}
    router.push("/resume?from_home=1")
  }

  return (
    <div className="min-h-screen" style={SHEET_GRID}>
      <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon">基础简历适配台</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">先整理基础简历与素材，再粘贴目标 JD，进入下一步匹配改写。</p>
        </div>
        <button
          onClick={beginMatch}
          disabled={!baseResume.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          进入 JD 匹配修改 →
        </button>
      </div>

      <div className="grid items-stretch gap-5 lg:h-[calc(100vh-11rem)] lg:min-h-[560px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="shrink-0">
            <SectionHeading code="H-01 / BASE" title="基础简历" right={<span className="text-xs text-[var(--text-muted)]">{charCount} 字</span>} />
            <WorkCard>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  handleFile(e.dataTransfer.files?.[0])
                }}
                className="cursor-pointer rounded-xl border border-dashed border-[var(--border)] bg-white px-4 py-3 transition-colors hover:border-[var(--primary)]/50"
              >
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={e => handleFile(e.target.files?.[0])} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{uploading ? "正在读取文件..." : "拖动简历文件到这里"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">也可以直接点击上传，或在下方粘贴基础简历文本。</p>
                  </div>
                  <span className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">上传</span>
                </div>
              </div>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="粘贴你的基础简历，或从下方素材库选择经历自动组成基础简历..."
                className="mt-3 h-36 w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
            </WorkCard>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <SectionHeading code="H-02 / MATERIALS" title="素材库集合" right={<span className="text-xs text-[var(--text-muted)]">{loading ? "读取中" : `${selectedCount} 项已选`}</span>} />
            <WorkCard className="min-h-0 flex-1">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {internships.map(item => (
                  <MaterialToggle
                    key={`internship-${item.id}`}
                    checked={selected.has(`internship-${item.id}`)}
                    title={`${item.company} · ${item.position}`}
                    sub={item.highlights}
                    type="实习"
                    onClick={() => toggleMaterial(`internship-${item.id}`)}
                  />
                ))}
                {projects.map(item => (
                  <MaterialToggle
                    key={`project-${item.id}`}
                    checked={selected.has(`project-${item.id}`)}
                    title={`${item.name} · ${item.role}`}
                    sub={[item.background, item.contribution, item.result].filter(Boolean).join(" / ")}
                    type="项目"
                    onClick={() => toggleMaterial(`project-${item.id}`)}
                  />
                ))}
                {skills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIncludeSkills(v => !v)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      includeSkills ? "border-[var(--primary)] bg-white" : "border-[var(--border)] bg-white"
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-semibold text-[var(--text-main)]">技能集合</span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">{skills.length} 项技能会作为基础能力背景</span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--primary)]">{includeSkills ? "已加入" : "未加入"}</span>
                  </button>
                )}
                {!loading && internships.length === 0 && projects.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
                    素材库还没有经历。<Link href="/profile" className="text-[var(--primary)] hover:underline">去添加素材 →</Link>
                  </div>
                )}
              </div>
            </WorkCard>
          </div>

        </section>

        <section className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col">
            <SectionHeading code="H-04 / JD" title="目标 JD" right={<span className="text-xs text-[var(--text-muted)]">粘贴后进入匹配</span>} />
            <WorkCard className="min-h-0 flex-1">
              <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="公司，例如 字节跳动"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                />
                <input
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="岗位，例如 AI 产品经理"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                />
              </div>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="把目标岗位 JD 粘贴在这里。下一步会提取岗位要求、匹配素材经历，并进入简历改写。"
                className="mt-3 min-h-0 w-full flex-1 resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
              <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 text-xs text-[var(--text-muted)]">
                  <span className="rounded-lg border border-[var(--border)] bg-white px-2 py-1">{jdText.trim().length} 字</span>
                  <span className="rounded-lg border border-[var(--border)] bg-white px-2 py-1">{latestVersion ? "可基于历史版本继续" : "可从基础简历开始"}</span>
                </div>
                <button
                  onClick={beginMatch}
                  disabled={!baseResume.trim()}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  开始匹配修改
                </button>
              </div>
            </WorkCard>
          </div>

          <div className="shrink-0">
            <SectionHeading code="H-05 / VERSIONS" title="历史简历" right={<span className="text-xs text-[var(--text-muted)]">{versions.length} 份</span>} />
            <WorkCard>
              <div className="flex h-[124px] items-stretch gap-3 overflow-x-auto pb-1">
                {versions.slice(0, 8).map(v => {
                  const score = parseScore(v.analysis_json)
                  return (
                    <Link
                      href={`/resume?version_id=${v.id}`}
                      key={v.id}
                      className="w-40 shrink-0 rounded-lg border border-[var(--border)] bg-white p-3 transition-colors hover:border-[var(--primary)]/45"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--text-sub)]">版本</span>
                        <span className="text-xs font-semibold text-[var(--primary)]">{score == null ? "--" : score}</span>
                      </div>
                      <p className="line-clamp-2 text-xs font-semibold leading-5 text-[var(--text-main)]">{v.version_name}</p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(v.created_at)}</p>
                    </Link>
                  )
                })}
                {versions.length === 0 && (
                  <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-white text-xs text-[var(--text-muted)]">
                    暂无历史版本 · 在上方粘贴 JD 后开始匹配即可生成
                  </div>
                )}
              </div>
            </WorkCard>
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
