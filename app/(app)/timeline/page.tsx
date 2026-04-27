'use client'
import { useState, useMemo, Fragment } from 'react'
import { useAppData } from '@/lib/useAppData'
import { calcLoad, getMonths, addWorkingDays, countWorkingDays, ROLE_COLORS } from '@/lib/calc'
import { buildHolidaySet } from '@/lib/holidays'
import { PeriodNav, FilterButtons, Modal } from '@/components/ui'
import type { Contract, ContractStage, ProjectObject } from '@/types'

interface StageBar {
  stage: ContractStage
  stageIdx: number
  start: Date
  end: Date
  leftPct: number
  widthPct: number
  clippedLeft: boolean
  color: string
}

interface ContractRow {
  contract: Contract
  object: ProjectObject | null
  bars: StageBar[]
}

interface SelectedStage {
  contract: Contract
  object: ProjectObject | null
  stage: ContractStage
  stageIdx: number
  start: Date
  end: Date
  workingDays: number
}

export default function TimelinePage() {
  const { objects, employees, contracts, norms, settings, loading } = useAppData()
  const [offset, setOffset] = useState(0)
  const [empFilter, setEmpFilter] = useState('all')
  const [selected, setSelected] = useState<SelectedStage | null>(null)

  const months = useMemo(() => getMonths(6, offset), [offset])
  const load = useMemo(
    () => calcLoad(contracts, objects, employees, norms, settings, offset),
    [contracts, objects, employees, norms, settings, offset]
  )

  const windowStart = useMemo(
    () => new Date(months[0].year, months[0].month, 1),
    [months]
  )
  const windowEnd = useMemo(
    () => new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0, 23, 59, 59, 999),
    [months]
  )
  const windowMs = windowEnd.getTime() - windowStart.getTime()

  const holidays = useMemo(
    () => buildHolidaySet(windowStart.getFullYear() - 1, windowEnd.getFullYear() + 1, settings.customHolidays ?? []),
    [windowStart, windowEnd, settings.customHolidays]
  )

  const today = new Date()
  const todayMonthIdx = today.getFullYear() * 12 + today.getMonth()

  const stageRows = useMemo<ContractRow[]>(() => {
    const rows: ContractRow[] = []
    for (const c of contracts) {
      if (c.status === 'done') continue
      const obj = objects.find(o => o.id === c.objectId) || null
      const bars: StageBar[] = []
      ;(c.stages || []).forEach((s, idx) => {
        if (!s.startDate) return
        const start = new Date(s.startDate)
        const end = addWorkingDays(start, s.days || 20, holidays)
        if (end < windowStart || end > windowEnd) return

        const renderStart = start > windowStart ? start : windowStart
        const leftPct = Math.max(0, (renderStart.getTime() - windowStart.getTime()) / windowMs * 100)
        const rawWidth = (end.getTime() - renderStart.getTime()) / windowMs * 100
        const widthPct = Math.max(0.8, Math.min(rawWidth, 100 - leftPct))
        const clippedLeft = start < windowStart

        const endMonthIdx = end.getFullYear() * 12 + end.getMonth()
        const monthsUntilEnd = endMonthIdx - todayMonthIdx
        let color: string
        if (monthsUntilEnd <= 0) color = 'var(--accent4)'
        else if (monthsUntilEnd === 1) color = '#f59a4a'
        else if (monthsUntilEnd <= 3) color = 'var(--accent3)'
        else color = 'var(--text3)'

        bars.push({ stage: s, stageIdx: idx, start, end, leftPct, widthPct, clippedLeft, color })
      })
      if (bars.length > 0) rows.push({ contract: c, object: obj, bars })
    }
    return rows
  }, [contracts, objects, holidays, windowStart, windowEnd, windowMs, todayMonthIdx])

  const maxH = settings.hoursMonth
  const activeRoles = useMemo(
    () => Array.from(new Set(employees.map(e => e.role))),
    [employees]
  )

  const roleFilterOptions = [
    { value: 'all', label: 'Все' },
    ...activeRoles.map(r => ({ value: r, label: r, color: ROLE_COLORS[r] })),
  ]

  const teamSummary = useMemo(() => {
    return months.map(m => {
      let minFreePct = 100
      let hasData = false
      for (const role of activeRoles) {
        const roleEmps = employees.filter(e => e.role === role)
        if (roleEmps.length === 0) continue
        hasData = true
        const totalCap = roleEmps.length * maxH
        const totalLoad = roleEmps.reduce((sum, e) => sum + (load[e.id]?.[m.key] || 0), 0)
        const free = Math.max(0, totalCap - totalLoad)
        const pct = totalCap > 0 ? (free / totalCap * 100) : 0
        if (pct < minFreePct) minFreePct = pct
      }
      return hasData ? Math.round(minFreePct) : 0
    })
  }, [months, activeRoles, employees, load, maxH])

  function openStage(row: ContractRow, bar: StageBar) {
    const wd = countWorkingDays(bar.start, bar.end, holidays)
    setSelected({
      contract: row.contract,
      object: row.object,
      stage: bar.stage,
      stageIdx: bar.stageIdx,
      start: bar.start,
      end: bar.end,
      workingDays: wd,
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text3)' }}>
      Загрузка данных...
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="font-head text-lg font-semibold mb-1">Дашборд</div>
          <div className="text-xs" style={{ color: 'var(--text2)' }}>Сроки этапов и свободная ёмкость команды</div>
        </div>
        <PeriodNav offset={offset} months={months} onShift={d => setOffset(o => o + d)} onReset={() => setOffset(0)} />
      </div>

      {/* Block 1 — Stages timeline */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-head font-semibold tracking-wide text-xs" style={{ color: 'var(--text2)' }}>
            ЗАВЕРШАЮЩИЕСЯ ЭТАПЫ — СЛЕДУЮЩИЕ 6 МЕСЯЦЕВ
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text3)' }}>
            <LegendDot color="var(--accent4)" label="в этом месяце" />
            <LegendDot color="#f59a4a" label="через 1 мес" />
            <LegendDot color="var(--accent3)" label="через 2–3 мес" />
            <LegendDot color="var(--text3)" label="позже" />
          </div>
        </div>

        {/* Month header */}
        <div className="grid mb-1.5" style={{ gridTemplateColumns: '200px 1fr' }}>
          <div />
          <div className="grid" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
            {months.map(m => (
              <div key={m.key} className="text-center text-[10px] tracking-wide" style={{ color: 'var(--text3)' }}>{m.label}</div>
            ))}
          </div>
        </div>

        {stageRows.length === 0 ? (
          <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>
            Нет завершающихся этапов в выбранном периоде
          </div>
        ) : (
          stageRows.map(row => (
            <div key={row.contract.id} className="grid items-center mb-1.5" style={{ gridTemplateColumns: '200px 1fr' }}>
              <div className="pr-3 truncate">
                <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>
                  {row.object?.name || row.contract.name}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent2)' }}>{row.contract.service}</div>
              </div>
              <div className="relative rounded" style={{ height: 30, background: 'var(--surface2)' }}>
                {/* Month grid lines */}
                {months.slice(1).map((_, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${(i + 1) / months.length * 100}%`,
                      top: 0, bottom: 0, width: 1,
                      background: 'var(--border)',
                    }}
                  />
                ))}
                {/* Stage bars */}
                {row.bars.map(b => (
                  <button
                    key={b.stageIdx}
                    type="button"
                    onClick={() => openStage(row, b)}
                    title={`${b.stage.stage}: ${formatDate(b.start)} — ${formatDate(b.end)}`}
                    className="absolute flex items-center px-1.5 transition-all hover:brightness-125"
                    style={{
                      left: `${b.leftPct}%`,
                      width: `${b.widthPct}%`,
                      top: 4,
                      height: 22,
                      background: b.color,
                      borderRadius: b.clippedLeft ? '0 4px 4px 0' : 4,
                      borderLeft: b.clippedLeft ? '3px solid rgba(255,255,255,0.4)' : 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: '#0a0c10' }}>
                      {b.stage.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Block 2 — Free capacity */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-head font-semibold tracking-wide text-xs" style={{ color: 'var(--text2)' }}>
            ОКНО ДЛЯ НОВОГО ДОГОВОРА — СВОБОДНАЯ ЁМКОСТЬ
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text3)' }}>
            <LegendDot color="var(--accent)" label="≥ 50%" />
            <LegendDot color="var(--accent3)" label="20–49%" />
            <LegendDot color="var(--accent4)" label="< 20%" />
          </div>
        </div>
        <FilterButtons options={roleFilterOptions} value={empFilter} onChange={setEmpFilter} />

        <div className="mt-4">
          {/* Month header */}
          <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
            <div />
            {months.map(m => (
              <div key={m.key} className="text-center text-[10px] tracking-wide" style={{ color: 'var(--text3)' }}>{m.label}</div>
            ))}
          </div>

          {/* Team summary */}
          {activeRoles.length > 0 && (
            <div className="grid gap-1 mb-2 items-center" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
              <div className="pr-2">
                <div className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>Команда</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>минимум по ролям</div>
              </div>
              {teamSummary.map((pct, i) => (
                <FreeCell key={i} pct={pct} label={`${pct}%`} bold />
              ))}
            </div>
          )}

          {activeRoles.length === 0 && (
            <div className="text-xs py-6 text-center" style={{ color: 'var(--text3)' }}>Добавьте сотрудников</div>
          )}

          {activeRoles
            .filter(role => empFilter === 'all' || empFilter === role)
            .map(role => {
              const roleEmps = employees.filter(e => e.role === role)
              const totalCap = roleEmps.length * maxH
              const roleData = months.map(m => {
                const totalLoad = roleEmps.reduce((sum, e) => sum + (load[e.id]?.[m.key] || 0), 0)
                const free = Math.max(0, totalCap - totalLoad)
                const pct = totalCap > 0 ? Math.round(free / totalCap * 100) : 0
                return { free: Math.round(free), pct }
              })
              const color = ROLE_COLORS[role] || 'var(--accent)'
              return (
                <Fragment key={role}>
                  <div className="grid gap-1 mb-1 items-center mt-2 pt-2" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)`, borderTop: '1px solid var(--border)' }}>
                    <div className="pr-2">
                      <div className="text-[11px] font-medium" style={{ color }}>{role}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>{roleEmps.length} чел · {totalCap} ч/мес</div>
                    </div>
                    {roleData.map((d, i) => (
                      <FreeCell key={i} pct={d.pct} label={`${d.pct}%`} sub={`${d.free} ч`} />
                    ))}
                  </div>

                  {/* Individual employees */}
                  {roleEmps.map(emp => {
                    const empData = months.map(m => {
                      const empLoad = load[emp.id]?.[m.key] || 0
                      const free = Math.max(0, maxH - empLoad)
                      const pct = maxH > 0 ? Math.round(free / maxH * 100) : 0
                      return { free: Math.round(free), pct }
                    })
                    return (
                      <div key={emp.id} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
                        <div className="pr-2 pl-3">
                          <div className="text-[11px] truncate" style={{ color: 'var(--text2)' }}>{emp.name}</div>
                          <div className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{emp.type}</div>
                        </div>
                        {empData.map((d, i) => (
                          <FreeCell key={i} pct={d.pct} label={`${d.free} ч`} sub={`${d.pct}%`} compact />
                        ))}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
        </div>
      </div>

      {/* Stage detail modal */}
      {selected && (
        <Modal
          open={true}
          title={`${selected.contract.name} · ${selected.stage.stage}`}
          onClose={() => setSelected(null)}
        >
          <div className="flex flex-col gap-3 text-xs">
            <Detail label="Объект" value={selected.object?.name || '—'} />
            <Detail label="Услуга" value={selected.contract.service} />
            <Detail label="Начало этапа" value={formatDate(selected.start)} />
            <Detail label="Окончание этапа" value={formatDate(selected.end)} />
            <Detail label="Длительность" value={`${selected.workingDays} раб. дн. (${selected.stage.days} плановых)`} />

            <div className="mt-1 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>КОМАНДА</div>
              <div className="flex flex-col gap-1.5">
                {selected.contract.team.length === 0 && (
                  <div className="text-[11px]" style={{ color: 'var(--text3)' }}>Команда не назначена</div>
                )}
                {selected.contract.team.map(t => {
                  const emp = employees.find(e => e.id === t.employeeId)
                  return (
                    <div key={t.id} className="flex justify-between">
                      <span style={{ color: ROLE_COLORS[t.role] || 'var(--text2)' }}>{t.role}</span>
                      <span style={{ color: 'var(--text)' }}>{emp ? emp.name : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2 }} />
      {label}
    </span>
  )
}

interface FreeCellProps {
  pct: number
  label: string
  sub?: string
  bold?: boolean
  compact?: boolean
}

function FreeCell({ pct, label, sub, bold, compact }: FreeCellProps) {
  let bg = 'rgba(74,240,180,0.12)'
  let fg = 'var(--accent)'
  if (pct < 20) {
    bg = 'rgba(245,106,106,0.12)'
    fg = 'var(--accent4)'
  } else if (pct < 50) {
    bg = 'rgba(245,168,74,0.12)'
    fg = 'var(--accent3)'
  }
  return (
    <div
      className="rounded-md flex flex-col items-center justify-center"
      style={{ height: compact ? 38 : 46, background: bg }}
    >
      <span className={bold ? 'text-[12px] font-bold' : 'text-[11px] font-semibold'} style={{ color: fg }}>{label}</span>
      {sub && <span className="text-[9px] mt-0.5" style={{ color: fg, opacity: 0.7 }}>{sub}</span>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}
