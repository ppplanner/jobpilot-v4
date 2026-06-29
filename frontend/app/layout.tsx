/**
 * 全局布局文件 — 相当于 Python 里的「每个页面都会执行的代码」
 *
 * TypeScript 快速上手注释：
 *   interface = 类型定义（像 Python dataclass）
 *   React.FC  = React 函数组件
 *   {children} = 解构赋值（从 props 取出 children）
 */
import type { Metadata, Viewport } from "next"
import { Geist, ZCOOL_KuaiLe } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/Sidebar"

const geist = Geist({ subsets: ["latin"] })
// 灵动卡通中文字体(站酷快乐体),用于标题。中文字体较大,关闭预加载
const cartoon = ZCOOL_KuaiLe({ weight: "400", variable: "--font-cartoon", display: "swap", preload: false })

// 页面标题和描述（SEO 用）
export const metadata: Metadata = {
  title: "JobPilot — 秋招多Agent助手",
  description: "B端产品经理秋招全流程助手",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

// 根布局组件 — 每个页面都会被包裹在这里
export default function RootLayout({
  children,
}: {
  children: React.ReactNode   // 相当于 Python 的 Any 类型，但专指 React 内容
}) {
  return (
    <html lang="zh">
      <body className={`${geist.className} ${cartoon.variable}`}>
        <Sidebar />

        {/* 桌面端留出侧边栏宽度，移动端由顶部导航占位 */}
        <main className="min-h-screen bg-[var(--bg)] sm:ml-52">
          {children}
        </main>
      </body>
    </html>
  )
}
