"use client"
import { useState, useEffect } from "react"
import { SHEET_GRID } from "@/components/blueprint"

const BASE_URL = ""

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com")
  const [model, setModel] = useState("deepseek-chat")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(BASE_URL + "/api/v1/settings/api-key")
      .then(r => r.json())
      .then(data => {
        setBaseUrl(data.base_url || "https://api.deepseek.com")
        setModel(data.model || "deepseek-chat")
        if (data.has_key) setApiKey("••••••••••••••••")
      })
      .catch(() => setMessage({ type: "error", text: "无法连接后端" }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!apiKey.trim() || apiKey.startsWith("•")) {
      setMessage({ type: "error", text: "请输入有效的 API Key" })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(BASE_URL + "/api/v1/settings/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim(), base_url: baseUrl.trim(), model: model.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "保存失败")
      setApiKey("••••••••••••••••")
      setMessage({ type: "success", text: "API Key 已保存，立即生效" })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    setSaving(true); setMessage(null)
    try {
      const res = await fetch(BASE_URL + "/api/v1/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "你好，请回复「连接成功」" }], agent_type: "general" }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "测试失败")
      const data = await res.json()
      setMessage({ type: "success", text: "连接成功！AI 回复: " + data.content })
    } catch (err: any) { setMessage({ type: "error", text: err.message }) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 placeholder:text-[var(--text-muted)]"

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center text-[var(--text-muted)]">
      <p>加载中...</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-12" style={SHEET_GRID}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-0.5">Settings</p>
      <h1 className="text-xl font-bold text-[var(--text-main)] font-cartoon mb-1">API 设置</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">配置 LLM API Key，AI 功能才能正常工作</p>

      {message && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border ${
          message.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">
            API Key <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onFocus={() => { if (apiKey.startsWith("•")) setApiKey("") }}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className={inputCls}
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">支持 DeepSeek / OpenAI / 通义千问 等兼容接口的 API Key</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">API 地址</label>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className={inputCls} />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            DeepSeek: https://api.deepseek.com · OpenAI: https://api.openai.com/v1
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">模型名称</label>
          <input value={model} onChange={e => setModel(e.target.value)} className={inputCls} />
          <p className="text-xs text-[var(--text-muted)] mt-1">推荐: deepseek-chat (¥0.001/次) · gpt-4o-mini · qwen-plus</p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存配置"}
        </button>
        <button
          onClick={handleTest}
          disabled={saving}
          className="px-6 py-3 text-sm font-semibold rounded-xl border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--primary)] hover:bg-[var(--surface2)] transition-all disabled:opacity-50"
        >
          {saving ? "测试中..." : "测试连接"}
        </button>
      </div>

      <div className="mt-10 pt-8 border-t border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">如何获取 API Key</h3>
        <div className="space-y-3 text-xs text-[var(--text-sub)] leading-relaxed">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="font-semibold text-[var(--text-main)] mb-1">DeepSeek（推荐，最便宜）</p>
            <p>1. 打开 <a href="https://platform.deepseek.com" target="_blank" className="text-[var(--primary)] underline">platform.deepseek.com</a></p>
            <p>2. 注册 → 创建 API Key → 充值 ¥10 够用很久</p>
            <p className="text-[var(--text-muted)] mt-1">费用：约 ¥0.001/次对话，每天投递+刷题 100 次才 ¥0.1</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="font-semibold text-[var(--text-main)] mb-1">通义千问（阿里云）</p>
            <p>1. 打开 <a href="https://dashscope.console.aliyun.com" target="_blank" className="text-[var(--primary)] underline">dashscope.aliyun.com</a></p>
            <p>2. 开通模型服务 → 创建 API Key</p>
            <p className="text-[var(--text-muted)] mt-1">Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1</p>
            <p className="text-[var(--text-muted)]">Model: qwen-plus</p>
          </div>
        </div>
      </div>
    </div>
  )
}
