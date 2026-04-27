'use client'
import { useState, useMemo } from 'react'
import { useAppData } from '@/lib/useAppData'
import { calcLoad, getMonths, ROLE_COLORS } from '@/lib/calc'
import { PeriodNav, FilterButtons, PageHeader } from '@/components/ui'

function hmClass(h: number, maxH: number) {
  if (h <= 0) return 'hm-0'
  if (h <= 40) return 'hm-1'
  if (h <= 80) return 'hm-2'
  if (h <= 120) return 'hm-3'
  if (h <= maxH) return 'hm-4'
  return 'hm-5'
}

export default function HeatmapPage() {
  const { objects, employees, contracts, norms, settings, loading } = useAppData()
  const [offset, setOffset] = useState(0)
  const [roleFilter, setRoleFilter] = useState('all')

  const months = useMemo(() => getMonths(12, offset), [offset])
  const load = useMemo(
    () => calcLoad(contracts, objects, employees, norms, settings, offset),
    [contracts, objects, employees, norms, settings, offset]
  )

  const allRoles = [...new Set(employees.map(e => e.role))]
  const filteredEmps = roleFilter === 'all' ? employees : employees.filter(e => e.role === roleFilter)

  const roleFilterOptions = [
    { value: 'all', label: 'Все' },
    ...allRoles.map(r => ({ value: r, label: r, color: ROLE_COLORS[r] })),
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-xs" style={{ color: 'var(--text3)' }}>Загрузка...</div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="font-head text-lg font-semibold mb-1">Тепловая карта нагрузки</div>
          <div className="text-xs" style={{ color: 'var(--text2)' }}>Нагрузка сотрудников по месяцам в часах</div>
        </div>
        <PeriodNav offset={offset} months={months} onShift={d => setOffset(o => o + d)} onReset={() => setOffset(0)} />
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
                          className={`${hmClass(h, settings.hoursMonth)} rounded flex items-center justify-center text-[11px] font-medium cursor-default transition-transform hover:scale-105`}
                          style={{ width: 52, height: 32 }}
                          title={`${emp.name}: ${h}ч`}
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
    </div>
  )
}
