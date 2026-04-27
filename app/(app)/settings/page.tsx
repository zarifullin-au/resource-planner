'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAppData } from '@/lib/useAppData'
import { PageHeader, Modal } from '@/components/ui'
import { fetchJson, showError } from '@/lib/api'
import type { AppSettings } from '@/types'
import { RU_HOLIDAY_MONTH_DAYS } from '@/lib/holidays'

export default function SettingsPage() {
  const { settings, contracts, refresh, loading } = useAppData()
  const [form, setForm] = useState<AppSettings>(settings)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [newHoliday, setNewHoliday] = useState('')

  useEffect(() => { setForm(settings) }, [settings])

  function handleChange(field: keyof AppSettings, value: string) {
    setForm(p => ({ ...p, [field]: parseFloat(value) || 0 }))
    setDirty(true)
    setSaved(false)
  }

  function addHoliday() {
    if (!newHoliday || !/^\d{4}-\d{2}-\d{2}$/.test(newHoliday)) return
    const ruSet = new Set(RU_HOLIDAY_MONTH_DAYS.map(md => `${newHoliday.slice(0, 4)}-${md}`))
    if (ruSet.has(newHoliday)) { setNewHoliday(''); return }
    if ((form.customHolidays || []).includes(newHoliday)) { setNewHoliday(''); return }
    setForm(p => ({ ...p, customHolidays: [...(p.customHolidays || []), newHoliday].sort() }))
    setNewHoliday('')
    setDirty(true)
    setSaved(false)
  }

  function removeHoliday(date: string) {
    setForm(p => ({ ...p, customHolidays: (p.customHolidays || []).filter(d => d !== date) }))
    setDirty(true)
    setSaved(false)
  }

  const ruHolidaysForYear = useMemo(
    () => RU_HOLIDAY_MONTH_DAYS.map(md => `${holidayYear}-${md}`),
    [holidayYear]
  )
  const customHolidaysForYear = useMemo(
    () => (form.customHolidays || []).filter(d => d.startsWith(`${holidayYear}-`)),
    [form.customHolidays, holidayYear]
  )

  async function handleSave() {
    try {
      await fetchJson('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setDirty(false)
      setSaved(true)
      setConfirmOpen(false)
      refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      showError(e)
    }
  }

  const activeContracts = contracts.filter(c => c.status !== 'done').length

  if (loading) return <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>Загрузка...</div>

  return (
    <div>
      <PageHeader
        title="Настройки"
        sub="Глобальные параметры расчёта"
        right={
          <button className="btn btn-primary flex items-center gap-1.5" onClick={() => setConfirmOpen(true)}>
            <span>✓</span> Сохранить настройки
          </button>
        }
      />

      {dirty && !saved && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(245,168,74,0.1)', border: '1px solid rgba(245,168,74,0.3)', color: 'var(--accent3)' }}>
          ⚠ Есть несохранённые изменения — нажмите «Сохранить настройки» для применения
        </div>
      )}
      {saved && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(74,240,180,0.08)', border: '1px solid rgba(74,240,180,0.25)', color: 'var(--accent)' }}>
          ✓ Настройки сохранены и применены ко всем проектам
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="font-head text-[11px] font-semibold tracking-wide mb-4" style={{ color: 'var(--text2)' }}>РАБОЧИЕ ПАРАМЕТРЫ</div>
          <div className="flex flex-col gap-3">
            <Row label="Рабочих часов в день">
              <input type="number" className="form-input" style={{ width: 80 }} value={form.hoursDay} onChange={e => handleChange('hoursDay', e.target.value)} />
            </Row>
            <Row label="Рабочих часов в месяц">
              <input type="number" className="form-input" style={{ width: 80 }} value={form.hoursMonth} onChange={e => handleChange('hoursMonth', e.target.value)} />
            </Row>
            <Row label="Страховые взносы">
              <input type="number" step="0.01" className="form-input" style={{ width: 80 }} value={form.insurance} onChange={e => handleChange('insurance', e.target.value)} />
            </Row>
          </div>
        </div>

        <div className="card">
          <div className="font-head text-[11px] font-semibold tracking-wide mb-4" style={{ color: 'var(--text2)' }}>КОЭФФИЦИЕНТЫ СЛОЖНОСТИ</div>
          <div className="flex flex-col gap-3">
            <Row label="Стандартный">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kStandard} onChange={e => handleChange('kStandard', e.target.value)} />
            </Row>
            <Row label="Средней сложности">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kMedium} onChange={e => handleChange('kMedium', e.target.value)} />
            </Row>
            <Row label="Сложный">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kComplex} onChange={e => handleChange('kComplex', e.target.value)} />
            </Row>
          </div>

          <div className="font-head text-[11px] font-semibold tracking-wide mt-5 mb-4 pt-4" style={{ color: 'var(--text2)', borderTop: '1px solid var(--border)' }}>КОЭФФИЦИЕНТЫ СПЕЦИАЛИСТОВ</div>
          <div className="flex flex-col gap-3">
            <Row label="Ведущий специалист">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kSenior} onChange={e => handleChange('kSenior', e.target.value)} />
            </Row>
            <Row label="Специалист">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kMid} onChange={e => handleChange('kMid', e.target.value)} />
            </Row>
            <Row label="Младший специалист">
              <input type="number" step="0.05" className="form-input" style={{ width: 80 }} value={form.kJunior} onChange={e => handleChange('kJunior', e.target.value)} />
            </Row>
          </div>
        </div>
      </div>

      {/* Holidays section */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-head text-[11px] font-semibold tracking-wide" style={{ color: 'var(--text2)' }}>ПРАЗДНИЧНЫЕ ДНИ</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>ГОД</span>
            <input
              type="number"
              className="form-input"
              style={{ width: 90 }}
              value={holidayYear}
              onChange={e => setHolidayYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>
        </div>

        <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>ОФИЦИАЛЬНЫЕ ПРАЗДНИКИ РФ</div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {ruHolidaysForYear.map(d => (
            <span key={d} className="tag tag-gray">{formatDate(d)}</span>
          ))}
        </div>

        <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>ДОПОЛНИТЕЛЬНЫЕ ПРАЗДНИКИ ({holidayYear})</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {customHolidaysForYear.length === 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text3)' }}>Нет добавленных дат</span>
          )}
          {customHolidaysForYear.map(d => (
            <span
              key={d}
              className="tag tag-orange flex items-center gap-1.5"
              style={{ paddingRight: 6 }}
            >
              {formatDate(d)}
              <button
                onClick={() => removeHoliday(d)}
                className="leading-none"
                style={{ color: 'var(--accent4)', fontSize: 13 }}
                title="Удалить"
              >×</button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={newHoliday}
            onChange={e => setNewHoliday(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={addHoliday} disabled={!newHoliday}>
            + Добавить
          </button>
        </div>
        <div className="text-[10px] mt-2" style={{ color: 'var(--text3)' }}>
          Дополнительные праздники учитываются в расчётах рабочих дней наряду с официальными.
        </div>
      </div>

      {/* Confirm save modal */}
      <Modal open={confirmOpen} title="Применить настройки?" onClose={() => setConfirmOpen(false)} onSave={handleSave} saveLabel="Применить ко всем проектам">
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text2)' }}>
          Новые параметры будут применены ко всем расчётам нагрузки, включая{' '}
          <strong style={{ color: 'var(--text)' }}>{activeContracts} активных договоров</strong>.
        </p>
        <div className="rounded-lg p-3.5 flex flex-col gap-2 text-xs" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          {[
            ['Часов в день', form.hoursDay],
            ['Часов в месяц', form.hoursMonth],
            ['Страховые взносы', `${Math.round(form.insurance * 100)}%`],
            ['К-т сложности', `${form.kStandard} / ${form.kMedium} / ${form.kComplex}`],
            ['К-т специалиста', `${form.kSenior} / ${form.kMid} / ${form.kJunior}`],
            ['Доп. праздников', (form.customHolidays || []).length],
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between">
              <span style={{ color: 'var(--text3)' }}>{label}</span>
              <span style={{ color: 'var(--text)' }}>{val}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs flex-1" style={{ color: 'var(--text2)' }}>{label}</span>
      {children}
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}
