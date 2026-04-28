'use client'
import { useState, useMemo } from 'react'
import { useAppData } from '@/lib/useAppData'
import { calcLoad, getMonths, ROLE_COLORS, ROLES, hexToRgb } from '@/lib/calc'
import { PeriodNav, FilterButtons, PageHeader } from '@/components/ui'

export default function DashboardPage() {
  const { objects, employees, contracts, norms, settings, loading } = useAppData()
  const [offset, setOffset] = useState(0)
  const [empFilter, setEmpFilter] = useState('all')

  const months = useMemo(() => getMonths(6, offset), [offset])
  const load = useMemo(
    () => calcLoad(contracts, objects, employees, norms, settings, offset),
    [contracts, objects, employees, norms, settings, offset]
  )

  const maxH = settings.hoursMonth
  const activeRoles = [...new Set(employees.map(e => e.role))]

  const filteredEmps = empFilter === 'all' ? employees : employees.filter(e => e.role === empFilter)

  const roleFilterOptions = [
    { value: 'all', label: 'Все' },
    ...activeRoles.map(r => ({ value: r, label: r, color: ROLE_COLORS[r] })),
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text3)' }}>
      Загрузка данных...
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="font-head text-lg font-semibold mb-1">Загрузка сотрудников</div>
          <div className="text-xs" style={{ color: 'var(--text2)' }}>Сводная нагрузка по всем активным договорам</div>
        </div>
        <PeriodNav offset={offset} months={months} onShift={d => setOffset(o => o + d)} onReset={() => setOffset(0)} />
      </div>

      {/* Role load block */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4 text-[11px]">
          <span className="font-head font-semibold tracking-wide text-xs" style={{ color: 'var(--text2)' }}>
            НАГРУЗКА ПО РОЛЯМ — СЛЕДУЮЩИЕ 6 МЕСЯЦЕВ
          </span>
          <span style={{ color: 'var(--text3)' }}>% от доступных часов роли · остаток часов</span>
        </div>

        {/* Month header */}
        <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `130px repeat(${months.length}, 1fr)` }}>
          <div />
          {months.map(m => (
            <div key={m.key} className="text-center text-[10px] tracking-wide" style={{ color: 'var(--text3)' }}>{m.label}</div>
          ))}
        </div>

        {activeRoles.map(role => {
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

        {activeRoles.length === 0 && (
          <div className="text-xs py-6 text-center" style={{ color: 'var(--text3)' }}>Добавьте сотрудников и договоры</div>
        )}
      </div>

      {/* Employee load block */}
      <div className="card">
        <div className="font-head font-semibold tracking-wide text-xs mb-3" style={{ color: 'var(--text2)' }}>
          ЗАГРУЗКА СОТРУДНИКОВ — СЛЕДУЮЩИЕ 6 МЕСЯЦЕВ (В ЧАСАХ)
        </div>
        <FilterButtons options={roleFilterOptions} value={empFilter} onChange={setEmpFilter} />
        <div className="mt-4">
          {/* Month header */}
          <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `130px repeat(${months.length}, 1fr)` }}>
            <div />
            {months.map(m => (
              <div key={m.key} className="text-center text-[10px] tracking-wide" style={{ color: 'var(--text3)' }}>{m.label}</div>
            ))}
          </div>

          {filteredEmps.map(emp => {
            const roleColor = ROLE_COLORS[emp.role] || '#94a3b8'
            return (
              <div key={emp.id} className="grid gap-1 mb-2 items-center" style={{ gridTemplateColumns: `130px repeat(${months.length}, 1fr)` }}>
                <div className="pr-2">
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{emp.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: roleColor }}>{emp.role}</div>
                  <div className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{emp.type}</div>
                </div>
                {months.map(m => {
                  const v = load[emp.id]?.[m.key] || 0
                  const pct = maxH > 0 ? Math.round(v / maxH * 100) : 0
                  const barPct = Math.min(100, pct)
                  const remainder = Math.max(0, Math.round(maxH - v))
                  const excess = Math.max(0, Math.round(v - maxH))
                  const barColor = v > maxH ? 'var(--accent4)' : v > maxH * 0.8 ? 'var(--accent3)' : roleColor
                  const labelDark = barPct > 55
                  return (
                    <div
                      key={m.key}
                      className="relative rounded-md overflow-hidden cursor-default"
                      style={{ height: 52, background: 'var(--surface2)' }}
                      title={`${emp.name}: ${Math.round(v)}ч загружено / ${maxH}ч норма · ${pct}%${v > maxH ? ' ⚠ ПЕРЕГРУЗКА +' + excess + 'ч' : ' остаток ' + remainder + 'ч'}`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-md transition-all duration-500"
                        style={{ height: `${barPct}%`, background: barColor, opacity: 0.85 }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 z-10">
                        <span className="text-[11px] font-bold" style={{ color: labelDark ? '#1f2041' : 'var(--text2)' }}>
                          {Math.round(v) ? `${Math.round(v)}ч` : '—'}
                        </span>
                        {Math.round(v) > 0 && (
                          <span className="text-[9px]" style={{ color: v > maxH ? (labelDark ? 'rgba(0,0,0,0.7)' : 'var(--accent4)') : (labelDark ? 'rgba(0,0,0,0.55)' : 'var(--text3)') }}>
                            {v > maxH ? `+${excess}ч` : `−${remainder}ч`}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {filteredEmps.length === 0 && (
            <div className="text-xs py-6 text-center" style={{ color: 'var(--text3)' }}>Нет сотрудников</div>
          )}
        </div>
      </div>
    </div>
  )
}
