/**
 * 全局求职档案 hook
 * 从 localStorage 读取 target_role（加快速度），同时尝试从后端同步
 * 其他页面用此 hook 获取用户的「PM方向」，动态调整文案/Prompt
 */
"use client"
import { useState, useEffect } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const LS_KEY = "jobpilot_target_role"

export interface ProfileSnap {
  target_role: string   // 如 "C端产品经理" / "B端产品经理" / "增长产品经理"
  name: string
}

const DEFAULT_PROFILE: ProfileSnap = {
  target_role: "产品经理",
  name: "",
}

export function useProfile() {
  // 初始始终用默认值，保证服务端与客户端首屏渲染一致（避免 hydration mismatch）
  const [profile, setProfile] = useState<ProfileSnap>(DEFAULT_PROFILE)

  useEffect(() => {
    // 挂载后再读 localStorage 快速回显缓存
    try {
      const cached = localStorage.getItem(LS_KEY)
      if (cached) setProfile(JSON.parse(cached))
    } catch { /* ignore */ }
    fetch(`${API}/api/v1/profile/basic`)
      .then(r => r.json())
      .then(data => {
        const snap: ProfileSnap = {
          target_role: data.target_role || "产品经理",
          name: data.name || "",
        }
        setProfile(snap)
        localStorage.setItem(LS_KEY, JSON.stringify(snap))
      })
      .catch(() => { /* 后端未启动时使用缓存 */ })
  }, [])

  return profile
}
