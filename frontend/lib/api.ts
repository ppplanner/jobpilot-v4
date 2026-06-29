/**
 * API 客户端 — 封装所有对 FastAPI 后端的调用
 *
 * ⚡ 架构说明：
 * - 使用相对路径 /api/... 而不是 http://localhost:8000/api/...
 * - Next.js rewrites 会把 /api/* 代理到后端（见 next.config.ts）
 * - 好处：局域网同学访问时也能正常连接到宿主机的后端
 *
 * 使用方式：
 *   import { api } from "@/lib/api"
 *   const data = await api.applications.getAll()
 */

// 相对路径前缀（空字符串 = 使用当前域名，通过 Next.js rewrites 代理到后端）
// 只在服务端渲染或特殊场景下才需要完整 URL
const BASE_URL = ""

// ===================== 基础 fetch 封装 =====================
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "请求失败")
  }
  return res.json()
}

// ===================== 数据类型定义（对应后端 schemas）=====================
export interface Application {
  id: number
  company: string
  position: string
  tier: string
  status: string
  applied_date: string
  source: string
  contact: string
  notes: string
  jd_url: string
  jd_score?: number | null
  jd_summary?: string
  jd_text?: string
  interview_at?: string
  deadline?: string
  created_at?: string
}

export interface CalendarEvent {
  type: "interview" | "deadline" | "offer_deadline"
  date: string
  time: string
  company: string
  position: string
  status: string
  app_id: number
}

export interface CustomCalendarEvent {
  id: number
  date: string
  title: string
  type: string
  time: string
  created_at: string
}

export interface PersonalQuestion {
  id: number
  question: string
  source_company: string
  source_position: string
  source_round: string
  application_id: number | null
  is_practiced: number
  created_at: string
}

export interface Debrief {
  id: number
  application_id: number
  round: string
  interview_date: string
  questions: string
  self_score: number
  went_wrong: string
  interviewer_fb: string
  created_at: string
}

export interface ApplicationStats {
  total: number
  by_status: Record<string, number>
  by_tier: Record<string, number>
}

export interface ProfileInternship {
  id: number
  company: string
  position: string
  department: string
  start_date: string
  end_date: string
  is_current: number
  highlights: string
}

export interface ProfileProject {
  id: number
  name: string
  role: string
  start_date: string
  end_date: string
  background: string
  contribution: string
  result: string
  tech_stack: string
}

export interface ProfileSkill {
  id: number
  category: string
  skill_name: string
  level: string
}

export interface ProfileBasic {
  name?: string
  school?: string
  major?: string
  degree?: string
  gpa?: string
  graduation?: string
  target_role?: string
  target_city?: string
  self_intro?: string
}

export interface ResumeVersion {
  id: number
  version_name: string
  content: string
  target_role: string
  created_at: string
  is_active?: number
  analysis_json?: string
  snapshot_json?: string
  application_id?: number | null
}

// 结构化改写结果
export interface RewriteInternship {
  company: string
  position: string
  original: string
  rewritten: string
  note: string
}

export interface RewriteProject {
  name: string
  original: string
  rewritten: string
  note: string
}

export interface RewriteSkill {
  before: string
  after: string
  reason: string
}

export interface RewriteResult {
  internships: RewriteInternship[]
  projects: RewriteProject[]
  skills: RewriteSkill[]
  actions: string[]
  raw: string | null    // 如果 JSON 解析失败，这里有原始文字
  mode: string
  temperature: number
}

// ===================== 能力标签 =====================
export interface MaterialRef {
  type: "internship" | "project"
  id: number
}
export interface MyTag {
  id: string
  label: string
  domain: "direction" | "method" | "domain" | "tooling" | "soft"
  strength: "强" | "弱"
  materials: MaterialRef[]
  in_jd?: boolean
}
export interface JdTag {
  id: string
  label: string
  domain: MyTag["domain"]
  priority: "核心" | "重要" | "加分"
  status: "命中" | "部分" | "缺口"
}
export interface TagMatchResult {
  jd_tags: JdTag[]
  my_tags: MyTag[]
  gaps: JdTag[]
  score: number
  uncatalogued: string[]
  empty?: boolean
}

// ===================== API 方法 =====================
export const api = {
  // ---------- 投递记录 ----------
  applications: {
    getAll: () => request<Application[]>("/api/v1/applications"),
    getStats: () => request<ApplicationStats>("/api/v1/applications/stats"),
    create: (data: Omit<Application, "id" | "created_at">) =>
      request<Application>("/api/v1/applications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Application>) =>
      request<Application>(`/api/v1/applications/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/v1/applications/${id}`, {
        method: "DELETE",
      }),
    getDebriefs: (id: number) =>
      request<Debrief[]>(`/api/v1/applications/${id}/debriefs`),
    createDebrief: (id: number, data: Omit<Debrief, "id" | "application_id" | "created_at">) =>
      request<Debrief>(`/api/v1/applications/${id}/debriefs`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteDebrief: (appId: number, debriefId: number) =>
      request<{ message: string }>(`/api/v1/applications/${appId}/debriefs/${debriefId}`, {
        method: "DELETE",
      }),
    saveJDAnalysis: (id: number, data: { jd_score: number; jd_summary: string }) =>
      request<Application>(`/api/v1/applications/${id}/jd-analysis`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getCalendar: () => request<CalendarEvent[]>("/api/v1/applications/calendar"),
  },

  // ---------- 简历 ----------
  resume: {
    upload: async (file: File): Promise<{ text: string; char_count: number }> => {
      const form = new FormData()
      form.append("file", file)
      // 注意：上传文件不能设置 Content-Type（浏览器自动设置 multipart/form-data + boundary）
      const res = await fetch(`/api/v1/resume/upload`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "文件上传失败" }))
        throw new Error(err.detail || "文件上传失败")
      }
      return res.json()
    },

    diagnose: (resume_text: string, target_role = "B端产品经理") =>
      request<{ result: string }>("/api/v1/resume/diagnose", {
        method: "POST",
        body: JSON.stringify({ resume_text, target_role }),
      }),

    // 流式诊断 — 返回 ReadableStream，前端可以实时显示
    diagnoseStream: (resume_text: string, target_role = "B端产品经理") =>
      fetch(`/api/v1/resume/diagnose/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text, target_role }),
      }),

    getVersions: (applicationId?: number) =>
      request<ResumeVersion[]>(
        applicationId != null ? `/api/v1/resume/versions?application_id=${applicationId}` : "/api/v1/resume/versions"
      ),
    saveVersion: (data: { version_name: string; content: string; target_role?: string; analysis_json?: string; snapshot_json?: string; application_id?: number }) =>
      request<{ id: number }>("/api/v1/resume/versions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    linkVersion: (id: number, applicationId: number | null) =>
      request<ResumeVersion>(`/api/v1/resume/versions/${id}/link`, {
        method: "PATCH",
        body: JSON.stringify({ application_id: applicationId }),
      }),
    deleteVersion: (id: number) =>
      request<{ message: string }>(`/api/v1/resume/versions/${id}`, {
        method: "DELETE",
      }),
  },

  // ---------- 求职档案 ----------
  profile: {
    getBasic: () => request<ProfileBasic>("/api/v1/profile/basic"),
    updateBasic: (data: ProfileBasic) =>
      request<{ message: string }>("/api/v1/profile/basic", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getInternships: () => request<ProfileInternship[]>("/api/v1/profile/internships"),
    addInternship: (data: any) =>
      request<{ id: number }>("/api/v1/profile/internships", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteInternship: (id: number) =>
      request(`/api/v1/profile/internships/${id}`, { method: "DELETE" }),
    getProjects: () => request<ProfileProject[]>("/api/v1/profile/projects"),
    addProject: (data: any) =>
      request<{ id: number }>("/api/v1/profile/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteProject: (id: number) =>
      request(`/api/v1/profile/projects/${id}`, { method: "DELETE" }),
    getSkills: () => request<ProfileSkill[]>("/api/v1/profile/skills"),
    addSkill: (data: { category: string; skill_name: string; level: string }) =>
      request<{ id: number }>("/api/v1/profile/skills", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteSkill: (id: number) =>
      request(`/api/v1/profile/skills/${id}`, { method: "DELETE" }),
  },

  // ---------- AI 对话 ----------
  ai: {
    chat: (messages: { role: string; content: string }[], agent_type = "general") =>
      request<{ content: string }>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages, agent_type }),
      }),

    // 流式对话 — 返回 Response，前端读取 SSE 流
    chatStream: (messages: { role: string; content: string }[], agent_type = "general") =>
      fetch(`/api/v1/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, agent_type }),
      }),

    parseJD: (jd_text: string, company: string) =>
      request<any>("/api/v1/ai/jd/parse", {
        method: "POST",
        body: JSON.stringify({ jd_text, company }),
      }),
    jdProfile: (data: { jd_text: string; company?: string; position?: string }) =>
      request<{
        pm_type: string
        experience_level: string
        key_dimensions: Array<{ name: string; priority: string; detail: string }>
        ideal_profile: string
        rewrite_focus: string
      }>("/api/v1/ai/jd-profile", { method: "POST", body: JSON.stringify(data) }),
    matchMaterials: (data: { jd_text: string; company?: string; position?: string }) =>
      request<{
        internships: Array<{ id: number; match: string; reason: string }>
        projects: Array<{ id: number; match: string; reason: string }>
        empty?: boolean
      }>("/api/v1/ai/match-materials", { method: "POST", body: JSON.stringify(data) }),
    generateQuestions: (data: { jd_text: string; company: string; position: string; application_id: number }) =>
      request<{ questions: string[]; count: number }>("/api/v1/ai/generate-questions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    // 能力标签:我的能力(仅素材库,与JD无关)
    myTags: () =>
      request<{ my_tags: MyTag[]; empty?: boolean }>("/api/v1/ai/my-tags"),
    // 能力标签:JD需求标签 × 我的标签命中分析
    tagMatch: (data: { jd_text: string; company?: string; position?: string }) =>
      request<TagMatchResult>("/api/v1/ai/tag-match", { method: "POST", body: JSON.stringify(data) }),
  },

  // ---------- 日历自定义事件 ----------
  calendar: {
    getAll: () => request<CustomCalendarEvent[]>("/api/v1/calendar"),
    create: (data: { date: string; title: string; type: string; time: string }) =>
      request<CustomCalendarEvent>("/api/v1/calendar", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<{ date: string; title: string; type: string; time: string }>) =>
      request<CustomCalendarEvent>(`/api/v1/calendar/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/v1/calendar/${id}`, { method: "DELETE" }),
  },

  // ---------- 刷题 ----------
  practice: {
    getQuestions: (params?: { category?: string; difficulty?: string; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.category) q.set("category", params.category)
      if (params?.difficulty) q.set("difficulty", params.difficulty)
      if (params?.limit) q.set("limit", String(params.limit))
      return request<any>(`/api/v1/practice/questions?${q}`)
    },
    getStats: () => request<any>("/api/v1/practice/stats"),
    addRecord: (data: { question_id: number; user_answer?: string; is_correct?: boolean }) =>
      request<{ id: number }>("/api/v1/practice/records", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getPersonal: () => request<PersonalQuestion[]>("/api/v1/practice/personal"),
    addPersonal: (data: Omit<PersonalQuestion, "id" | "is_practiced" | "created_at">) =>
      request<PersonalQuestion>("/api/v1/practice/personal", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    togglePracticed: (id: number) =>
      request<{ is_practiced: number }>(`/api/v1/practice/personal/${id}/practiced`, {
        method: "PUT",
      }),
    deletePersonal: (id: number) =>
      request<{ message: string }>(`/api/v1/practice/personal/${id}`, {
        method: "DELETE",
      }),
  },
}
