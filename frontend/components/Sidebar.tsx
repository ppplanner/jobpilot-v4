"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useProfile } from "@/lib/useProfile"

function Icon({ d, className = "" }: { d: string | string[]; className?: string }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg className={`w-[18px] h-[18px] shrink-0 ${className}`} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="18" rx="3" fill="#F7F1E8" stroke="#102F59" strokeWidth="1.5" />
      <path d="M9 10h6M9 14h8M9 18h5" stroke="#102F59" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M17 7l5 4-5 4" stroke="#E36B2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="21" r="2" fill="#E36B2C" />
    </svg>
  )
}

function RoleMark() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 10.5L7.5 3l6 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="3" r="1.6" fill="#E36B2C" />
    </svg>
  )
}

const NAV = [
  {
    href: "/",
    label: "今日",
    d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/tracker",
    label: "投递看板",
    d: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
  },
  {
    href: "/resume",
    label: "简历工作台",
    d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    href: "/calendar",
    label: "求职日历",
    d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    href: "/practice",
    label: "刷题中心",
    d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    href: "/profile",
    label: "素材库",
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    href: "/jd-analysis",
    label: "JD 分析",
    d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
]

const SETTINGS_ICON = [
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
]

export default function Sidebar() {
  const pathname = usePathname()
  const profile = useProfile()
  const role = profile.target_role || "产品经理"
  const initial = (profile.name || role).charAt(0).toUpperCase()

  return (
    <>
      {/* ===== 桌面端侧边栏 ===== */}
      <aside className="
        hidden sm:flex
        fixed left-0 top-0 z-40 h-screen flex-col
        w-52
        bg-white border-r border-gray-100 shadow-sm
        overflow-hidden
      ">
        {/* Logo */}
        <div className="h-14 flex items-center px-[18px] shrink-0 border-b border-gray-50">
          <BrandMark className="w-7 h-7 shrink-0" />
          <span className="ml-3 font-bold text-gray-800 text-sm whitespace-nowrap">
            JobPilot
          </span>
        </div>

        {/* 用户问候区（从首页顶部移来） */}
        <div className="px-4 py-4 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{initial}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {profile.name ? `Hi，${profile.name}` : "Hi，未来的产品经理"}
              </p>
              <Link href="/profile" className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline">
                <RoleMark /> {role}
              </Link>
            </div>
          </div>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
          {NAV.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`
                  flex items-center gap-3 px-[11px] py-[9px] rounded-xl
                  transition-colors duration-150 whitespace-nowrap
                  ${isActive
                    ? "bg-[var(--primary-bg)] text-[var(--primary)]"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }
                `}>
                <Icon d={item.d} className={isActive ? "text-[var(--primary)]" : ""} />
                <span className={`
                  text-[13px] whitespace-nowrap
                  opacity-100
                  ${isActive ? "font-semibold text-[var(--primary)]" : "font-medium text-gray-600"}
                `}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)]
                    opacity-100 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* 底部：设置 + 用户 */}
        <div className="px-2 pb-3 pt-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <Link href="/settings"
            className="flex items-center gap-3 px-[11px] py-[9px] rounded-xl
              text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors whitespace-nowrap">
            <Icon d={SETTINGS_ICON} />
            <span className="text-[13px] font-medium text-gray-600
              opacity-100">
              设置
            </span>
          </Link>
        </div>
      </aside>

      {/* ===== 移动端顶部导航（小屏保留）===== */}
      <nav className="sm:hidden sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center h-12 px-4 gap-1 overflow-x-auto">
          <Link href="/" className="flex items-center gap-1.5 mr-3 shrink-0">
            <BrandMark className="w-6 h-6" />
            <span className="font-bold text-gray-800 text-sm">JobPilot</span>
          </Link>
          {NAV.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[var(--primary-bg)] text-[var(--primary)] font-semibold"
                    : "text-gray-500 hover:bg-gray-50"
                }`}>
                {item.label}
              </Link>
            )
          })}
          <Link href="/settings" className="ml-auto shrink-0 text-gray-400 px-2 py-1.5">⚙</Link>
        </div>
      </nav>
    </>
  )
}
