"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useProfile } from "@/lib/useProfile"

type NavIcon = "fit" | "tracker" | "calendar" | "practice" | "profile" | "settings"

function LineIcon({ type, active = false, className = "" }: { type: NavIcon; active?: boolean; className?: string }) {
  const accent = active ? "var(--primary)" : "#16856d"
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  const mark = {
    fill: accent,
    stroke: accent,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  return (
    <svg className={`h-7 w-7 shrink-0 ${className}`} viewBox="0 0 32 32" aria-hidden="true">
      {type === "fit" && (
        <>
          <circle {...common} cx="11" cy="9" r="4" />
          <path {...common} d="M4 26c1.3-7.5 12.5-7.5 14 0" />
          <rect {...common} x="16" y="10" width="11" height="15" rx="2" />
          <path {...common} d="M19 15h5M19 19h4" />
          <circle {...mark} cx="25" cy="24" r="4" />
          <path d="M23.2 24l1.2 1.2 2.4-3" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {type === "tracker" && (
        <>
          <rect {...common} x="5" y="10" width="16" height="12" rx="2" />
          <path {...common} d="M5.5 11l7.5 6 7.5-6" />
          <path {...mark} d="M22 20l6-8-10 4 4 2z" />
        </>
      )}
      {type === "calendar" && (
        <>
          <rect {...common} x="6" y="7" width="20" height="20" rx="3" />
          <path {...common} d="M11 5v5M21 5v5M6 13h20" />
          <path {...mark} d="M12 19h4v4h-4z" />
          <path {...common} d="M20 19h2M20 23h2" />
        </>
      )}
      {type === "practice" && (
        <>
          <circle {...common} cx="11" cy="10" r="4" />
          <path {...common} d="M5 27c1.2-7.5 11-7.5 12 0" />
          <rect {...common} x="17" y="7" width="10" height="14" rx="2" />
          <path {...common} d="M20 12h4M20 16h3" />
          <path {...mark} d="M22 27l5-6" />
        </>
      )}
      {type === "profile" && (
        <>
          <path {...common} d="M5 25V9h8l2 3h12v13z" />
          <path {...common} d="M5 14h22" />
          <circle {...mark} cx="23" cy="23" r="4" />
          <path d="M23 25v-5M20.8 22.2L23 20l2.2 2.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {type === "settings" && (
        <>
          <path {...common} d="M16 5v4M16 23v4M8.2 8.2l2.8 2.8M21 21l2.8 2.8M5 16h4M23 16h4M8.2 23.8l2.8-2.8M21 11l2.8-2.8" />
          <circle {...common} cx="16" cy="16" r="5" />
          <circle {...mark} cx="16" cy="16" r="2" />
        </>
      )}
    </svg>
  )
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="18" rx="3" fill="#FFFFFF" stroke="#101716" strokeWidth="1.5" />
      <path d="M9 10h6M9 14h8M9 18h5" stroke="#101716" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M17 7l5 4-5 4" stroke="#16856d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="21" r="2.5" fill="#16856d" />
    </svg>
  )
}

function RoleMark() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 10.5L7.5 3l6 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="3" r="1.6" fill="#16856d" />
    </svg>
  )
}

const NAV = [
  {
    href: "/",
    label: "适配台",
    icon: "fit" as const,
  },
  {
    href: "/tracker",
    label: "投递看板",
    icon: "tracker" as const,
  },
  {
    href: "/calendar",
    label: "求职日历",
    icon: "calendar" as const,
  },
  {
    href: "/practice",
    label: "刷题中心",
    icon: "practice" as const,
  },
  {
    href: "/profile",
    label: "素材库",
    icon: "profile" as const,
  },
]

function SidebarSketch() {
  return (
    <div className="mx-3 mb-3 rounded-xl border border-dashed border-[var(--primary)]/45 bg-white/75 p-3">
      <svg viewBox="0 0 148 70" className="h-[70px] w-full" fill="none" aria-hidden="true">
        <circle cx="34" cy="23" r="12" fill="#fff" stroke="#101716" strokeWidth="1.7" />
        <path d="M16 62c2.8-18 32.4-18 37 0" stroke="#101716" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="62" y="17" width="46" height="36" rx="4" fill="#fff" stroke="#101716" strokeWidth="1.7" />
        <path d="M72 31h24M72 40h17" stroke="#101716" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M111 47h25M128 37l10 10-10 10" stroke="#101716" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="136" cy="47" r="8" fill="#16856d" />
      </svg>
      <p className="mt-2 text-xs font-semibold text-[var(--text-main)]">功能图标区</p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">岗位分析、需求匹配、简历生成会在首页串联。</p>
    </div>
  )
}

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
        bg-white border-r border-[var(--border)] shadow-sm
        overflow-hidden
      ">
        {/* Logo */}
        <div className="h-14 flex items-center px-[18px] shrink-0 border-b border-[var(--border)]">
          <BrandMark className="w-7 h-7 shrink-0" />
          <span className="ml-3 font-bold text-gray-800 text-sm whitespace-nowrap">
            JobPilot
          </span>
        </div>

        {/* 用户问候区（从首页顶部移来） */}
        <div className="px-4 py-4 border-b border-[var(--border)] shrink-0">
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
        <nav className="px-2 py-3 space-y-1 overflow-hidden">
          {NAV.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`
                  flex items-center gap-2.5 px-[9px] py-2 rounded-xl
                  transition-colors duration-150 whitespace-nowrap
                  ${isActive
                    ? "border border-[var(--primary)]/30 bg-[var(--primary-bg)] text-[var(--primary)]"
                    : "border border-transparent text-gray-500 hover:border-[var(--border)] hover:bg-[var(--surface2)]/35 hover:text-gray-700"
                  }
                `}>
                <LineIcon type={item.icon} active={isActive} className={isActive ? "text-[var(--primary)]" : "text-gray-700"} />
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

        <div className="flex-1" />
        <SidebarSketch />

        {/* 底部：设置 + 用户 */}
        <div className="px-2 pb-3 pt-2 border-t border-gray-100 space-y-0.5 shrink-0">
          <Link href="/settings"
            className="flex items-center gap-3 px-[11px] py-[9px] rounded-xl
              text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors whitespace-nowrap">
            <LineIcon type="settings" className="text-gray-600" />
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
