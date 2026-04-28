'use client'
import { useState, useMemo, useCallback } from 'react'
import { useAppData } from '@/lib/useAppData'
import { calcLoad, getMonths, addWorkingDays, countWorkingDays } from '@/lib/calc'
import { ROLE_COLORS } from '@/lib/calc'
import { buildHolidaySet } from '@/lib/holidays'
import { PeriodNav, Modal } from '@/components/ui'
import { ContractSlotFinder, type SlotDraftPreview } from '@/components/timeline/ContractSlotFinder'
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
  isDraft?: boolean
}

interface ContractRow {
  contract: Contract
  object: ProjectObject | null
  bars: StageBar[]
  isDraft?: boolean
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
  const [selected, setSelected] = useState<SelectedStage | null>(null)
  const [draft, setDraft] = useState<SlotDraftPreview | null>(null)

  const months = useMemo(() => getMonths(6, offset), [offset])

  const effectiveContracts = useMemo<Contract[]>(
    () => draft ? [...contracts, draft.contract] : contracts,
    [contracts, draft],
  )
  const effectiveObjects = useMemo<ProjectObject[]>(
    () => draft && draft.object.id === '__draft__' ? [...objects, draft.object] : objects,
    [objects, draft],
  )

  const load = useMemo(
    () => calcLoad(effectiveContracts, effectiveObjects, employees, norms, settings, offset),
    [effectiveContracts, effectiveObjects, employees, norms, settings, offset],
  )

  const windowStart = useMemo(
    () => new Date(months[0].year, months[0].month, 1),
    [months],
  )
  const windowEnd = useMemo(
    () => new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0, 23, 59, 59, 999),
    [months],
  )
  const windowMs = windowEnd.getTime() - windowStart.getTime()

  const holidays = useMemo(
    () => buildHolidaySet(windowStart.getFullYear() - 1, windowEnd.getFullYear() + 1, settings.customHolidays ?? []),
    [windowStart, windowEnd, settings.customHolidays],
  )

  const today = new Date()
  const todayMonthIdx = today.getFullYear() * 12 + today.getMonth()

  const stageRows = useMemo<ContractRow[]>(() => {
    const rows: ContractRow[] = []
    const allContracts: { c: Contract; isDraft: boolean }[] = [
      ...contracts.filter(c => c.status !== 'done').map(c => ({ c, isDraft: false })),
    ]
    if (draft) allContracts.push({ c: draft.contract, isDraft: true })

    for (const { c, isDraft } of allContracts) {
      const obj = isDraft
        ? draft!.object
        : (objects.find(o => o.id === c.objectId) || null)
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
        if (isDraft) color = 'var(--accent2)'

        bars.push({ stage: s, stageIdx: idx, start, end, leftPct, widthPct, clippedLeft, color, isDraft })
      })
      if (bars.length > 0) rows.push({ contract: c, object: obj, bars, isDraft })
    }
    return rows
  }, [contracts, objects, draft, holidays, windowStart, windowEnd, windowMs, todayMonthIdx])

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

  const handleDraftChange = useCallback((d: SlotDraftPreview | null) => setDraft(d), [])

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
          <div className="text-xs" style={{ color: 'var(--text2)' }}>Сроки этапов и подбор слота для нового договора</div>
        </div>
        <PeriodNav offset={offset} months={months} onShift={d => setOffset(o => o + d)} onReset={() => setOffset(0)} />
      </div>

      {/* Block 1 — Stages timeline (with optional draft preview) */}
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
            {draft && <LegendDot color="var(--accent2)" label="черновик" dashed />}
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
            <div key={`${row.contract.id}-${row.isDraft ? 'd' : 'r'}`} className="grid items-center mb-1.5" style={{ gridTemplateColumns: '200px 1fr' }}>
              <div className="pr-3 truncate">
                <div className="text-[12px] font-medium truncate" style={{ color: row.isDraft ? 'var(--accent2)' : 'var(--text)' }}>
                  {row.isDraft ? '✦ Черновик: ' : ''}{row.object?.name || row.contract.name}
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
                    onClick={() => row.isDraft ? null : openStage(row, b)}
                    title={`${b.stage.stage}: ${formatDate(b.start)} — ${formatDate(b.end)}${b.isDraft ? ' (черновик)' : ''}`}
                    className="absolute flex items-center px-1.5 transition-all hover:brightness-125"
                    style={{
                      left: `${b.leftPct}%`,
                      width: `${b.widthPct}%`,
                      top: 4,
                      height: 22,
                      background: b.isDraft ? 'transparent' : b.color,
                      border: b.isDraft ? '2px dashed var(--accent2)' : 'none',
                      opacity: b.isDraft ? 0.85 : 1,
                      borderRadius: b.clippedLeft ? '0 4px 4px 0' : 4,
                      borderLeft: !b.isDraft && b.clippedLeft ? '3px solid rgba(255,255,255,0.4)' : undefined,
                      cursor: row.isDraft ? 'default' : 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: b.isDraft ? 'var(--accent2)' : '#1f2041' }}>
                      {b.stage.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Block 2 — Contract Slot Finder */}
      <ContractSlotFinder
        objects={objects}
        employees={employees}
        contracts={contracts}
        norms={norms}
        settings={settings}
        months={months}
        effectiveLoad={load}
        onDraftChange={handleDraftChange}
      />

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

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span
        style={{
          display: 'inline-block', width: 10, height: 10, borderRadius: 2,
          background: dashed ? 'transparent' : color,
          border: dashed ? `2px dashed ${color}` : 'none',
        }}
      />
      {label}
    </span>
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
