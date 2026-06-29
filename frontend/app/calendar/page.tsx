"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { api, CalendarEvent, CustomCalendarEvent } from "@/lib/api"

const SEASONS = [
  { name: "秋招", start: [8, 1],  end: [10, 31], bg: "rgba(251,191,36,0.10)", accent: "#f59e0b" },
  { name: "春招", start: [2, 1],  end: [4, 30],  bg: "rgba(99,102,241,0.08)", accent: "#6366f1" },
  { name: "实习", start: [3, 1],  end: [6, 15],  bg: "rgba(16,185,129,0.08)", accent: "#10b981" },
]

function getSeasonBg(month: number, day: number) {
  for (const s of SEASONS) {
    const after  = month > s.start[0] || (month === s.start[0] && day >= s.start[1])
    const before = month < s.end[0]   || (month === s.end[0]   && day <= s.end[1])
    if (after && before) return s.bg
  }
  return null
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

const EVENT_STYLE: Record<string, { bg: string; text: string }> = {
  interview:      { bg: "bg-blue-50",    text: "text-blue-700"   },
  deadline:       { bg: "bg-orange-50",  text: "text-orange-700" },
  offer_deadline: { bg: "bg-emerald-50", text: "text-emerald-700"},
  面试:           { bg: "bg-blue-50",    text: "text-blue-700"   },
  截止:           { bg: "bg-orange-50",  text: "text-orange-700" },
  备考:           { bg: "bg-violet-50",  text: "text-violet-700" },
  其他:           { bg: "bg-[var(--surface2)]", text: "text-[var(--text-muted)]" },
}

const EVENT_LABEL: Record<string, string> = {
  interview: "面试", deadline: "截止", offer_deadline: "Offer截止",
}

const EVENT_TYPES = ["面试", "截止", "备考", "其他"]

function AddEventModal({ defaultDate, onSave, onClose }: {
  defaultDate: string
  onSave: (data: { date: string; title: string; type: string; time: string }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ date: defaultDate, title: "", type: "面试", time: "" })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl shadow-2xl w-80 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-[var(--text-main)] text-sm mb-4">添加日历事件</h3>
        <div className="space-y-3">
          <input autoFocus value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="事件标题"
            className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="border border-[var(--border)] bg-[var(--surface2)] rounded-xl px-3 py-2 text-sm text-[var(--text-sub)] outline-none focus:border-[var(--primary)]">
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="border border-[var(--border)] bg-[var(--surface2)] rounded-xl px-3 py-2 text-sm text-[var(--text-sub)] outline-none focus:border-[var(--primary)]" />
          </div>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-[var(--border)] bg-[var(--surface2)] rounded-xl px-3 py-2 text-sm text-[var(--text-sub)] outline-none focus:border-[var(--primary)]" />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-sub)] hover:bg-[var(--surface2)] transition-colors">取消</button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving}
            className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [trackerEvents, setTrackerEvents] = useState<CalendarEvent[]>([])
  const [customEvents,  setCustomEvents]  = useState<CustomCalendarEvent[]>([])
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [addDate, setAddDate] = useState("")

  const todayStr = today.toISOString().slice(0, 10)
  const m1 = viewMonth + 1

  useEffect(() => {
    Promise.all([
      api.applications.getCalendar().catch(() => []),
      api.calendar.getAll().catch(() => []),
    ]).then(([tracker, custom]) => {
      setTrackerEvents(Array.isArray(tracker) ? tracker : [])
      setCustomEvents(Array.isArray(custom) ? custom : [])
    })
  }, [])

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const trackerMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    trackerEvents.forEach(e => { (map[e.date] = map[e.date] || []).push(e) })
    return map
  }, [trackerEvents])

  const customMap = useMemo(() => {
    const map: Record<string, CustomCalendarEvent[]> = {}
    customEvents.forEach(e => { (map[e.date] = map[e.date] || []).push(e) })
    return map
  }, [customEvents])

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }
  const goToday   = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  const visibleSeasons = SEASONS.filter(s => !(s.end[0] < m1 || s.start[0] > m1))

  const selTrackerEvts = selectedDate ? (trackerMap[selectedDate] || []) : []
  const selCustomEvts  = selectedDate ? (customMap[selectedDate]  || []) : []

  const handleAddEvent = async (data: { date: string; title: string; type: string; time: string }) => {
    const created = await api.calendar.create(data)
    setCustomEvents(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
    setShowAddModal(false)
  }

  const handleDeleteCustom = async (id: number) => {
    await api.calendar.delete(id)
    setCustomEvents(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ── 标题栏 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">← 返回</Link>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface2)] text-[var(--text-muted)] transition-colors">‹</button>
            <h1 className="text-lg font-bold text-[var(--text-main)] min-w-[110px] text-center">
              {viewYear} 年 {m1} 月
            </h1>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface2)] text-[var(--text-muted)] transition-colors">›</button>
          </div>
          <button onClick={goToday}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] px-2.5 py-1 rounded-lg transition-colors">
            今天
          </button>
        </div>

        <div className="flex items-center gap-4">
          {visibleSeasons.map(s => (
            <div key={s.name} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.accent, opacity: 0.8 }} />
              <span className="text-xs text-[var(--text-muted)]">{s.name}</span>
            </div>
          ))}
          <button onClick={() => { setAddDate(todayStr); setShowAddModal(true) }}
            className="text-xs font-medium text-[var(--primary)] hover:opacity-80 transition-opacity">
            + 添加事件
          </button>
        </div>
      </div>

      {/* ── 星期标题 ── */}
      <div className="grid grid-cols-7 mb-1">
        {["一","二","三","四","五","六","日"].map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1.5 ${i >= 5 ? "text-[var(--text-muted)]" : "text-[var(--text-sub)]"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* ── 日历格子 ── */}
      <div className="grid grid-cols-7 border-t border-l border-[var(--border)] rounded-xl overflow-hidden">
        {grid.map((day, i) => {
          if (!day) return (
            <div key={i} className="h-24 border-b border-r border-[var(--border)] bg-[var(--surface2)]/40" />
          )

          const ds      = `${viewYear}-${String(m1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
          const isToday = ds === todayStr
          const isSel   = ds === selectedDate
          const isWeekend = (i % 7) >= 5
          const tEvts   = trackerMap[ds] || []
          const cEvts   = customMap[ds]  || []
          const sBg     = getSeasonBg(m1, day)
          const total   = tEvts.length + cEvts.length

          return (
            <div key={i}
              onClick={() => setSelectedDate(isSel ? null : ds)}
              className={`h-24 border-b border-r border-[var(--border)] p-1.5 flex flex-col gap-1 cursor-pointer transition-colors overflow-hidden
                ${isSel ? "bg-[var(--primary-bg)]" : isWeekend ? "bg-[var(--surface2)]/30" : "bg-[var(--surface)] hover:bg-[var(--surface2)]/50"}
              `}
              style={!isSel && !isWeekend && sBg ? { backgroundColor: sBg } : undefined}
            >
              {/* 日期数字 */}
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                isToday
                  ? "bg-[var(--primary)] text-white"
                  : isWeekend
                  ? "text-[var(--text-muted)]"
                  : "text-[var(--text-sub)]"
              }`}>
                {day}
              </div>

              {/* 事件 pill（最多显示2条）*/}
              {[...tEvts.map(e => ({
                  label: e.company,
                  sub: EVENT_LABEL[e.type] || e.type,
                  style: EVENT_STYLE[e.type] || EVENT_STYLE["其他"],
                })),
                ...cEvts.map(e => ({
                  label: e.title,
                  sub: e.time || "",
                  style: EVENT_STYLE[e.type] || EVENT_STYLE["其他"],
                }))
              ].slice(0, 2).map((ev, j) => (
                <div key={j} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${ev.style.bg} ${ev.style.text}`}>
                  <span className="truncate">{ev.label}</span>
                  {ev.sub && <span className="shrink-0 opacity-60 hidden sm:inline">{ev.sub}</span>}
                </div>
              ))}

              {total > 2 && (
                <span className="text-[9px] text-[var(--text-muted)] pl-1">+{total - 2}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 选中日期详情 ── */}
      {selectedDate && (
        <div className="mt-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--text-main)]">{selectedDate}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => { setAddDate(selectedDate); setShowAddModal(true) }}
                className="text-xs text-[var(--primary)] hover:underline font-medium">
                + 添加
              </button>
              <button onClick={() => setSelectedDate(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-lg leading-none">×</button>
            </div>
          </div>

          {selTrackerEvts.length === 0 && selCustomEvts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">当天无事件，点击右上角添加</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selTrackerEvts.map((ev, i) => {
                const s = EVENT_STYLE[ev.type] || EVENT_STYLE["其他"]
                return (
                  <Link href="/tracker" key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${s.bg} ${s.text}`}>
                    <span>{ev.company}</span>
                    {ev.time && <span className="opacity-70">{ev.time}</span>}
                    <span className="opacity-60">{EVENT_LABEL[ev.type] || ev.type}</span>
                  </Link>
                )
              })}
              {selCustomEvts.map(ev => {
                const s = EVENT_STYLE[ev.type] || EVENT_STYLE["其他"]
                return (
                  <div key={ev.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${s.bg} ${s.text}`}>
                    <span>{ev.title}</span>
                    {ev.time && <span className="opacity-70">{ev.time}</span>}
                    <button onClick={() => handleDeleteCustom(ev.id)}
                      className="ml-0.5 opacity-40 hover:opacity-80 transition-opacity">×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddEventModal
          defaultDate={addDate}
          onSave={handleAddEvent}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
