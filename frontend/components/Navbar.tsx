"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useProfile } from "@/lib/useProfile"

const NAV_ITEMS = [
  { href: "/",         label: "今日" },
  { href: "/tracker",  label: "投递看板" },
  { href: "/resume",   label: "简历工作台" },
  { href: "/practice", label: "刷题中心" },
  { href: "/profile",  label: "素材库" },
]

const ROLE_COLOR: Record<string, string> = {
  "B端产品经理":  "bg-blue-50 text-blue-600",
  "C端产品经理":  "bg-pink-50 text-pink-600",
  "增长产品经理": "bg-green-50 text-green-600",
  "数据产品经理": "bg-amber-50 text-amber-600",
  "平台产品经理": "bg-gray-100 text-gray-600",
  "游戏产品经理": "bg-purple-50 text-purple-600",
  "AI产品经理":   "bg-indigo-50 text-indigo-600",
  "产品经理":     "bg-[var(--surface2)] text-[var(--text-sub)]",
}

export default function Navbar() {
  const pathname = usePathname()
  const profile = useProfile()
  const role = profile.target_role || "产品经理"
  const badgeClass = ROLE_COLOR[role] || ROLE_COLOR["产品经理"]
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-12 gap-1">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 mr-4 shrink-0" onClick={() => setOpen(false)}>
          <span className="text-lg">🚀</span>
          <span className="font-bold text-[var(--text-main)] text-sm tracking-tight">JobPilot</span>
        </Link>

        {/* 桌面端导航 */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--surface2)] text-[var(--primary)] font-semibold"
                    : "text-[var(--text-sub)] hover:bg-[var(--surface2)] hover:text-[var(--text-main)]"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* 桌面端右侧 */}
        <div className="hidden sm:flex ml-auto items-center gap-2">
          <Link
            href="/profile"
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors hover:opacity-80 ${badgeClass}`}
          >
            {role}
          </Link>
          <Link
            href="/settings"
            className="px-2.5 py-1.5 text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] rounded transition-colors"
            title="API 设置"
          >
            ⚙
          </Link>
        </div>

        {/* 移动端右侧：设置 + 汉堡 */}
        <div className="sm:hidden ml-auto flex items-center gap-1">
          <Link
            href="/settings"
            className="px-2.5 py-1.5 text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] rounded transition-colors"
          >
            ⚙
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="px-2.5 py-1.5 text-[var(--text-sub)] hover:bg-[var(--surface2)] rounded transition-colors"
            aria-label="菜单"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {open && (
        <div className="sm:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 text-sm rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary-bg)] text-[var(--primary)] font-semibold"
                    : "text-[var(--text-sub)] hover:bg-[var(--surface2)]"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-[var(--border)]">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${badgeClass}`}
            >
              {role}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
