import type { ReactNode } from "react"

// ===== 蓝图皮肤(全站共用:保留墨绿主色,叠加图纸/描图纸质感) =====

// 淡墨绿网格底纹(描图纸感)——内联样式,不依赖全局 globals.css
export const SHEET_GRID = {
  backgroundImage:
    "linear-gradient(to right, rgba(46,91,84,0.05) 1px, transparent 1px)," +
    "linear-gradient(to bottom, rgba(46,91,84,0.05) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
}

// 图纸四角角标(L 形描线),需放进 position:relative 的容器
export function SheetCorners() {
  const base = "pointer-events-none absolute w-2.5 h-2.5 border-[var(--primary)]/25"
  return (
    <>
      <span className={`${base} left-2 top-2 border-l border-t`} />
      <span className={`${base} right-2 top-2 border-r border-t`} />
      <span className={`${base} left-2 bottom-2 border-l border-b`} />
      <span className={`${base} right-2 bottom-2 border-r border-b`} />
    </>
  )
}

// 图纸编号小标(等宽字,drafting caption)
export function SheetCode({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
      {children}
    </span>
  )
}

// 图纸卡片:白底 + 描边 + 四角角标 + 淡网格,内容自动置于网格之上
export function SheetCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`relative bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0" style={SHEET_GRID} />
      <SheetCorners />
      <div className="relative">{children}</div>
    </div>
  )
}

// 区块标题:图纸编号 + 卡通标题(与首页各区一致)
export function SheetHeading({ code, title, right }: { code: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-baseline gap-2">
        <SheetCode>{code}</SheetCode>
        <h3 className="text-base font-bold text-[var(--text-main)] font-cartoon">{title}</h3>
      </div>
      {right}
    </div>
  )
}
