'use client'
import { useState, useMemo } from 'react'
import { useAppData } from '@/lib/useAppData'
import {
  calcLoad, getMonths, ROLE_COLORS, STAGES,
  addWorkingDays, countWorkingDays, getComplexityK, getTypeK,
} from '@/lib/calc'
import { buildHolidaySet } from '@/lib/holidays'
import { PeriodNav, FilterButtons, Modal } from '@/components/ui'
import type { Employee, MonthData, Contract, ProjectObject, Norm, AppSettings } from '@/types'

function hmClass(h: number, maxH: number) {
  if (h <= 0) return 'hm-0'
  if (h <= 40) return 'hm-1'
  if (h <= 80) return 'hm-2'
  if (h <= 120) return 'hm-3'
  if (h <= maxH) return 'hm-4'
  return 'hm-5'
}

interface NormLine {
  artifact: string
  task: string
  role: string
  hours: number
}
interface StageDetail {
  stageName: string
  totalHours: number
  norms: NormLine[]
}
interface ContractDetail {
  contractName: string
  service: string
  objectName: string
  stages: StageDetail[]
  totalHours: number
}

const PAGE_SIZE = 5

export default function HeatmapPage() {
  const { objects, employees, contracts, norms, settings, loading } = useAppData()
  const [offset, setOffset] = useState(0)
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState<{ emp: Employee; month: MonthData } | null>(null)
  const [popupPage, setPopupPage] = useState(0)

  const months = useMemo(() => getMonths(12, offset), [offset])
  const load = useMemo(
    () => calcLoad(contracts, objects, employees, norms, settings, offset),
    [contracts, objects, employees, norms, settings, offset]
  )

  const holidays = useMemo(
    () => {
      const fromYear = months[0].year - 1
      const toYear = months[months.length - 1].year + 1
      return buildHolidaySet(fromYear, toYear, settings.customHolidays ?? [])
    },
    [months, settings.customHolidays]
  )

  const maxH = settings.hoursMonth
  const allRoles = Array.from(new Set(employees.map(e => e.role)))
  const filteredEmps = roleFilter === 'all' ? employees : employees.filter(e => e.role === roleFilter)

  const roleFilterOptions = [
    { value: 'all', label: 'Все' },
    ...allRoles.map(r => ({ value: r, label: r, color: ROLE_COLORS[r] })),
  ]

  const detail = useMemo<ContractDetail[]>(() => {
    if (!selected) return []
    return computeEmpMonthDetail(selected.emp, selected.month, contracts, objects, norms, settings, holidays)
  }, [selected, contracts, objects, norms, settings, holidays])

  const totalDetailHours = detail.reduce((s, c) => s + c.totalHours, 0)
  const totalPages = Math.max(1, Math.ceil(detail.length / PAGE_SIZE))
  const pagedDetail = detail.slice(popupPage * PAGE_SIZE, popupPage * PAGE_SIZE + PAGE_SIZE)

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text3)' }}>Загрузка...</div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="font-head text-lg font-semibold mb-1">Нагрузка сотрудников</div>
          <div className="text-xs" style={{ color: 'var(--text2)' }}>Загрузка по ролям и по сотрудникам</div>
        </div>
        <PeriodNav offset={offset} months={months} onShift={d => setOffset(o => o + d)} onReset={() => setOffset(0)} />
      </div>

      {/* Role load block — 12 months */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4 text-[11px]">
          <span className="font-head font-semibold tracking-wide text-xs" style={{ color: 'var(--text2)' }}>
            НАГРУЗКА ПО РОЛЯМ — 12 МЕСЯЦЕВ
          </span>
          <span style={{ color: 'var(--text3)' }}>% от доступных часов роли · остаток часов</span>
        </div>

        <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `130px repeat(${months.length}, 1fr)` }}>
          <div />
          {months.map(m => (
            <div key={m.key} className="text-center text-[10px] tracking-wide" style={{ color: 'var(--text3)' }}>{m.label}</div>
          ))}
        </div>

        {allRoles.map(role => {
          const color = ROLE_COLORS[role] || '#94a3b8'
          const roleEmps = employees.filter(e => e.role === role)
          const totalAvailH = roleEmps.length * maxH

          const monthData = months.map(m => {
            const loaded = roleEmps.reduce((sum, emp) => sum + (load[emp.id]?.[m.key] || 0), 0)
            const pct = totalAvailH > 0 ? Math.round(loaded / totalAvailH * 100) : 0
            const overload = pct > 100
            const remainder = overload ? 0 : Math.max(0, Math.round(totalAvailH - loaded))
            const excess = overload ? Math.round(loaded - totalAvailH) : 0
            return { loaded: Math.round(loaded), pct, overload, remainder, excess, totalAvailH }
          })

          const maxPct = Math.max(...monthData.map(d => d.pct), 100)

          return (
            <div key={role} className="grid gap-1 mb-2.5 items-end" style={{ gridTemplateColumns: `130px repeat(${months.length}, 1fr)` }}>
              <div className="pr-2 pb-1">
                <div className="text-[11px] font-medium" style={{ color }}>{role}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>{roleEmps.length} чел · {totalAvailH} ч/мес</div>
              </div>
              {monthData.map((d, i) => {
                const fillPct = maxPct > 0 ? (d.pct / maxPct * 100) : 0
                const normLinePct = maxPct > 0 ? (100 / maxPct * 100) : 100
                const barColor = d.pct > 150 ? 'var(--accent4)' : d.pct > 100 ? '#f59a4a' : d.pct > 80 ? 'var(--accent3)' : color
                const labelDark = fillPct > 55
                return (
                  <div
                    key={i}
                    className="relative rounded-md overflow-hidden cursor-default"
                    style={{ height: 52, background: 'var(--surface2)' }}
                    title={`${role}: ${d.loaded}ч загружено / ${d.totalAvailH}ч норма · ${d.pct}%${d.overload ? ' ⚠ ПЕРЕГРУЗКА +' + d.excess + 'ч' : ' остаток ' + d.remainder + 'ч'}`}
                  >
                    <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-md"
                      style={{ height: `${fillPct}%`, background: barColor, opacity: 0.85 }} />
                    {d.overload && (
                      <div className="absolute left-0 right-0" style={{ bottom: `${normLinePct}%`, height: 1.5, background: 'rgba(255,255,255,0.35)', zIndex: 2 }} />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 z-10">
                      <span className="text-[11px] font-bold" style={{ color: labelDark ? '#1f2041' : 'var(--text2)' }}>
                        {d.pct ? `${d.pct}%` : '—'}
                      </span>
                      {d.pct > 0 && (
                        <span className="text-[9px]" style={{ color: d.overload ? (labelDark ? 'rgba(0,0,0,0.7)' : 'var(--accent4)') : (labelDark ? 'rgba(0,0,0,0.55)' : 'var(--text3)') }}>
                          {d.overload ? `+${d.excess}ч` : `−${d.remainder}ч`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {allRoles.length === 0 && (
          <div className="text-xs py-6 text-center" style={{ color: 'var(--text3)' }}>Добавьте сотрудников и договоры</div>
        )}
      </div>

      <FilterButtons options={roleFilterOptions} value={roleFilter} onChange={setRoleFilter} />

      <div className="card mt-4">
        {/* Legend */}
        <div className="flex gap-4 flex-wrap mb-4">
          {[
            { cls: 'hm-0', label: '0 ч' },
            { cls: 'hm-1', label: '1–40 ч' },
            { cls: 'hm-2', label: '41–80 ч' },
            { cls: 'hm-3', label: '81–120 ч' },
            { cls: 'hm-4', label: '121–160 ч (норма)' },
            { cls: 'hm-5', label: '>160 ч (перегрузка)' },
          ].map(l => (
            <div key={l.cls} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
              <div className={`w-3 h-3 rounded-sm ${l.cls}`} />
              {l.label}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th className="text-left text-[10px] tracking-widest pb-2 pr-3" style={{ color: 'var(--text3)', width: 140 }}>Сотрудник</th>
                {months.map(m => (
                  <th key={m.key} className="text-center text-[10px] tracking-wide pb-2 px-0.5" style={{ color: 'var(--text3)' }}>{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmps.map(emp => (
                <tr key={emp.id}>
                  <td className="pr-3 py-0.5">
                    <div className="text-[11px] font-medium" style={{ color: 'var(--text2)' }}>{emp.name}</div>
                    <div className="text-[9px]" style={{ color: ROLE_COLORS[emp.role] || '#aaa' }}>{emp.role}</div>
                  </td>
                  {months.map(m => {
                    const h = Math.round(load[emp.id]?.[m.key] || 0)
                    return (
                      <td key={m.key} className="p-0.5">
                        <div
                          className={`${hmClass(h, settings.hoursMonth)} rounded flex items-center justify-center text-[11px] font-medium cursor-pointer transition-transform hover:scale-105`}
                          style={{ width: 52, height: 32 }}
                          title={`${emp.name}: ${h}ч`}
                          onClick={() => { setSelected({ emp, month: m }); setPopupPage(0) }}
                        >
                          {h > 0 ? h : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {filteredEmps.length === 0 && (
                <tr>
                  <td colSpan={months.length + 1} className="text-center py-6 text-xs" style={{ color: 'var(--text3)' }}>
                    Нет сотрудников
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selected}
        title={selected ? `${selected.emp.name} — ${selected.month.label}` : ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div>
            <div className="mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>Роль · {selected.emp.role} · {selected.emp.type}</div>
              <div className="text-[13px] mt-1" style={{ color: 'var(--text)' }}>
                <span className="font-semibold">{Math.round(totalDetailHours)} ч</span>
                <span style={{ color: 'var(--text2)' }}> из {maxH} ч</span>
                <span className="ml-2" style={{ color: totalDetailHours > maxH ? 'var(--accent4)' : 'var(--accent)' }}>
                  ({maxH > 0 ? Math.round(totalDetailHours / maxH * 100) : 0}%)
                </span>
              </div>
            </div>

            {detail.length === 0 ? (
              <div className="text-xs py-6 text-center" style={{ color: 'var(--text3)' }}>
                Нет задач в этом месяце
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {pagedDetail.map((c, i) => (
                    <div key={popupPage * PAGE_SIZE + i} className="rounded-md p-3" style={{ background: 'var(--surface2)' }}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                          {c.objectName}
                        </div>
                        <div className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                          {Math.round(c.totalHours)} ч
                        </div>
                      </div>
                      <div className="text-[11px] mb-2" style={{ color: 'var(--text2)' }}>
                        {c.contractName} <span style={{ color: 'var(--text3)' }}>· {c.service}</span>
                      </div>
                      {c.stages.map((s, si) => (
                        <div key={si} className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>{s.stageName}</div>
                            <div className="text-[11px]" style={{ color: 'var(--text2)' }}>{Math.round(s.totalHours)} ч</div>
                          </div>
                          <div className="flex flex-col gap-0.5 pl-3">
                            {s.norms.map((n, ni) => (
                              <div key={ni} className="flex items-baseline justify-between gap-2 text-[11px]">
                                <span style={{ color: 'var(--text2)' }}>
                                  {n.artifact}
                                  {n.task && <span style={{ color: 'var(--text3)' }}> · {n.task}</span>}
                                </span>
                                <span className="whitespace-nowrap" style={{ color: 'var(--text3)' }}>{n.hours.toFixed(1)} ч</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4 text-[11px]">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={popupPage === 0}
                      style={popupPage === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      onClick={() => setPopupPage(p => Math.max(0, p - 1))}
                    >
                      ‹ Пред
                    </button>
                    <span style={{ color: 'var(--text3)' }}>
                      Страница {popupPage + 1} из {totalPages}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={popupPage >= totalPages - 1}
                      style={popupPage >= totalPages - 1 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                      onClick={() => setPopupPage(p => Math.min(totalPages - 1, p + 1))}
                    >
                      След ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function computeEmpMonthDetail(
  emp: Employee,
  month: MonthData,
  contracts: Contract[],
  objects: ProjectObject[],
  norms: Norm[],
  settings: AppSettings,
  holidays: Set<string>
): ContractDetail[] {
  const result: ContractDetail[] = []
  const mStart = new Date(month.year, month.month, 1)
  const mEnd = new Date(month.year, month.month + 1, 0)

  const kT = getTypeK(emp.type, settings)

  for (const contract of contracts) {
    if (contract.status === 'done') continue
    if (!contract.team.some(t => t.employeeId === emp.id)) continue

    const object = objects.find(o => o.id === contract.objectId)
    if (!object) continue

    const isResidential = object.type === 'Жилой'
    const kC = getComplexityK(object.complexity, settings)

    const stages: StageDetail[] = []
    let contractTotal = 0

    for (let si = 0; si < (contract.stages || []).length; si++) {
      const stageInfo = contract.stages[si]
      if (!stageInfo?.startDate) continue

      const start = new Date(stageInfo.startDate)
      const end = addWorkingDays(start, stageInfo.days || 20, holidays)

      const overlapStart = start > mStart ? start : mStart
      const overlapEnd = end < mEnd ? end : mEnd
      if (overlapStart > overlapEnd) continue

      const overlapWD = countWorkingDays(overlapStart, overlapEnd, holidays)
      const totalWD = countWorkingDays(start, end, holidays) || 1
      const fraction = overlapWD / totalWD
      if (fraction <= 0) continue

      const stageName = STAGES[si] || stageInfo.stage
      const stageNorms = norms.filter(n => n.service === contract.service && n.stage === stageName && n.role === emp.role)

      const lines: NormLine[] = []
      let stageTotal = 0
      for (const n of stageNorms) {
        let baseVal = 1
        if (n.base === 'Площадь объекта') baseVal = object.area || 0
        else if (n.base === 'Кол-во комнат основные') baseVal = object.roomsMain || 0
        else if (n.base === 'Кол-во комнат вспомагательные') baseVal = object.roomsAux || 0
        else if (n.base === 'Кол-во комнат технические') baseVal = object.roomsTech || 0
        else if (n.base === 'Кол-во позиций ИИИ') baseVal = object.roomsIii || 0

        const hPerUnit = isResidential ? n.hResidential : n.hCommercial
        const hours = baseVal * hPerUnit * kC * kT * fraction
        if (hours <= 0) continue

        lines.push({ artifact: n.artifact, task: n.task, role: n.role, hours })
        stageTotal += hours
      }

      if (lines.length > 0) {
        stages.push({ stageName, totalHours: stageTotal, norms: lines })
        contractTotal += stageTotal
      }
    }

    if (stages.length > 0) {
      result.push({
        contractName: contract.name,
        service: contract.service,
        objectName: object.name,
        stages,
        totalHours: contractTotal,
      })
    }
  }

  result.sort((a, b) => b.totalHours - a.totalHours)
  return result
}
