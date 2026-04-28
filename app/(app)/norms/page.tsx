'use client'
import { useState, useMemo, useEffect } from 'react'
import { useAppData } from '@/lib/useAppData'
import { Modal, Confirm, PageHeader, FormGroup, FilterButtons } from '@/components/ui'
import { ROLES, SERVICES, STAGES, BASES, ROLE_COLORS } from '@/lib/calc'
import { fetchJson, showError } from '@/lib/api'
import type { Norm } from '@/types'

const SERVICE_COLORS: Record<string, string> = {
  'ДПИ': '#1A6BFF', 'ЭАП': '#6366f1', 'АЛР': '#f59e0b', 'Авторский надзор': '#0ea5e9',
}

const empty = (): Partial<Norm> => ({
  service: 'ДПИ', stage: 'Этап 1', artifact: '', task: '', role: 'Тимлид', base: 'Нет',
  hResidential: 0, hCommercial: 0,
})

export default function NormsPage() {
  const { norms, contracts, refresh, loading } = useAppData()
  const [svcFilter, setSvcFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<Partial<Norm>>(empty())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [dirtyMap, setDirtyMap] = useState<Record<string, Partial<Norm>>>({})
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  // Clean dirty entries that no longer exist in norms (e.g. after delete)
  useEffect(() => {
    setDirtyMap(prev => {
      const validIds = new Set(norms.map(n => n.id))
      const cleaned: typeof prev = {}
      let changed = false
      for (const [id, patch] of Object.entries(prev)) {
        if (validIds.has(id)) cleaned[id] = patch
        else changed = true
      }
      return changed ? cleaned : prev
    })
  }, [norms])

  const filtered = useMemo(() => {
    let n = norms
    if (svcFilter !== 'all') n = n.filter(x => x.service === svcFilter)
    if (stageFilter !== 'all') n = n.filter(x => x.stage === stageFilter)
    return n
  }, [norms, svcFilter, stageFilter])

  const dirtyCount = Object.keys(dirtyMap).length
  const activeContracts = contracts.filter(c => c.status !== 'done').length

  function getValue<K extends keyof Norm>(norm: Norm, field: K): Norm[K] {
    const dirty = dirtyMap[norm.id]
    if (dirty && field in dirty) return dirty[field] as Norm[K]
    return norm[field]
  }

  function queueChange<K extends keyof Norm>(id: string, field: K, value: Norm[K]) {
    setDirtyMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  async function handleSaveNew() {
    setSaving(true)
    try {
      await fetchJson('/api/norms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setAddOpen(false)
      setForm(empty())
      refresh()
    } catch (e) {
      showError(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAll() {
    const entries = Object.entries(dirtyMap)
    if (entries.length === 0) { setConfirmSaveOpen(false); return }

    setSavingAll(true)
    const results = await Promise.allSettled(
      entries.map(([id, patch]) => {
        const norm = norms.find(n => n.id === id)
        if (!norm) return Promise.resolve()
        return fetchJson(`/api/norms/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...norm, ...patch }),
        })
      })
    )

    const okIds = new Set<string>()
    const failed: string[] = []
    results.forEach((r, i) => {
      const id = entries[i][0]
      if (r.status === 'fulfilled') okIds.add(id)
      else failed.push((r.reason as Error).message)
    })

    setDirtyMap(prev => {
      const next = { ...prev }
      okIds.forEach(id => delete next[id])
      return next
    })
    setSavingAll(false)
    setConfirmSaveOpen(false)
    refresh()

    if (failed.length > 0) {
      showError(new Error(`Не удалось сохранить ${failed.length} из ${entries.length}: ${failed[0]}`))
    } else {
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 3000)
    }
  }

  function discardChanges() {
    if (dirtyCount === 0) return
    if (!confirm(`Отменить ${dirtyCount} несохранённых изменений?`)) return
    setDirtyMap({})
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await fetchJson(`/api/norms/${deleteId}`, { method: 'DELETE' })
      setDirtyMap(prev => {
        const next = { ...prev }
        delete next[deleteId]
        return next
      })
      setDeleteId(null)
      refresh()
    } catch (e) {
      showError(e)
    }
  }

  const svcOptions = [
    { value: 'all', label: 'Все' },
    ...SERVICES.map(s => ({ value: s, label: s === 'Авторский надзор' ? 'АН' : s, color: SERVICE_COLORS[s] })),
  ]
  const stageOptions = [
    { value: 'all', label: 'Все' },
    ...STAGES.map(s => ({ value: s, label: s })),
  ]

  if (loading) return <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>Загрузка...</div>

  return (
    <div>
      <PageHeader
        title="Нормативы"
        sub="Нормы часов на задачи — изменения применяются после сохранения"
        right={
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(empty()); setAddOpen(true) }}>+ Добавить задачу</button>
            <button
              className="btn btn-primary btn-sm flex items-center gap-1.5"
              disabled={dirtyCount === 0}
              style={dirtyCount === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => setConfirmSaveOpen(true)}
            >
              <span>✓</span> Сохранить нормативы{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
            {dirtyCount > 0 && (
              <button
                className="btn btn-sm"
                style={{ color: 'var(--accent4)', border: '1px solid rgba(245,106,106,0.3)', background: 'transparent' }}
                onClick={discardChanges}
              >
                ↺ Отменить
              </button>
            )}
          </div>
        }
      />

      {dirtyCount > 0 && !savedNotice && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(245,168,74,0.1)', border: '1px solid rgba(245,168,74,0.3)', color: 'var(--accent3)' }}>
          ⚠ Несохранённых изменений: {dirtyCount}. Изменения нормативов влияют на расчёты всех договоров — нажмите «Сохранить нормативы» для применения.
        </div>
      )}
      {savedNotice && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-xs" style={{ background: 'rgba(26,107,255,0.06)', border: '1px solid rgba(26,107,255,0.20)', color: 'var(--accent)' }}>
          ✓ Нормативы сохранены и применены ко всем расчётам
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] tracking-widest uppercase mr-1" style={{ color: 'var(--text3)' }}>Вид услуги</span>
          <FilterButtons options={svcOptions} value={svcFilter} onChange={setSvcFilter} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] tracking-widest uppercase mr-1" style={{ color: 'var(--text3)' }}>Этап</span>
          <FilterButtons options={stageOptions} value={stageFilter} onChange={setStageFilter} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Услуга', 'Этап', 'Артефакт', 'Задача', 'Роль', 'База', 'Жилой, ч', 'Коммерч., ч', ''].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase px-3 py-2 border-b border-[var(--border)]" style={{ color: 'var(--text3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const isDirty = !!dirtyMap[n.id]
                return (
                  <tr
                    key={n.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface2)]"
                    style={isDirty ? { background: 'rgba(245,168,74,0.06)' } : undefined}
                  >
                    <td className="px-3 py-2">
                      <span className="tag" style={{ background: `rgba(${SERVICE_COLORS[n.service] ? '74,240,180' : '136,145,168'},0.12)`, color: SERVICE_COLORS[n.service] || '#aaa', border: `1px solid ${SERVICE_COLORS[n.service] || '#aaa'}40` }}>
                        {n.service === 'Авторский надзор' ? 'АН' : n.service}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text2)' }}>{n.stage}</td>
                    <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text2)' }}>
                      <EditableCell value={getValue(n, 'artifact')} onSave={v => queueChange(n.id, 'artifact', v)} />
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text)' }}>
                      <EditableCell value={getValue(n, 'task')} onSave={v => queueChange(n.id, 'task', v)} />
                    </td>
                    <td className="px-3 py-2" style={{ color: ROLE_COLORS[getValue(n, 'role')] || '#aaa' }}>
                      <EditableSelect value={getValue(n, 'role')} options={ROLES} onSave={v => queueChange(n.id, 'role', v)} />
                    </td>
                    <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text3)' }}>
                      <EditableSelect value={getValue(n, 'base')} options={BASES} onSave={v => queueChange(n.id, 'base', v)} />
                    </td>
                    <td className="px-3 py-2">
                      <NumberCell
                        value={getValue(n, 'hResidential')}
                        color="var(--accent)"
                        onChange={v => queueChange(n.id, 'hResidential', v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberCell
                        value={getValue(n, 'hCommercial')}
                        color="var(--accent3)"
                        onChange={v => queueChange(n.id, 'hCommercial', v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button className="btn btn-danger btn-sm px-2" onClick={() => setDeleteId(n.id)}>✕</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--text3)' }}>Нет нормативов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add norm modal */}
      <Modal open={addOpen} title="Новая задача / норматив" onClose={() => setAddOpen(false)} onSave={handleSaveNew} saveLabel={saving ? 'Сохранение...' : 'Сохранить'}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Вид услуги">
              <select className="form-input" value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Этап">
              <select className="form-input" value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label="Артефакт">
            <input className="form-input" value={form.artifact} onChange={e => setForm(p => ({ ...p, artifact: e.target.value }))} placeholder="напр. Планировочное решение" />
          </FormGroup>
          <FormGroup label="Задача">
            <input className="form-input" value={form.task} onChange={e => setForm(p => ({ ...p, task: e.target.value }))} placeholder="напр. Сделать обмерный план" />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Роль">
              <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="База расчёта">
              <select className="form-input" value={form.base} onChange={e => setForm(p => ({ ...p, base: e.target.value }))}>
                {BASES.map(b => <option key={b}>{b}</option>)}
              </select>
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Жилой — норма часов">
              <input type="number" step="0.01" className="form-input" value={form.hResidential} onChange={e => setForm(p => ({ ...p, hResidential: parseFloat(e.target.value) || 0 }))} />
            </FormGroup>
            <FormGroup label="Коммерческий — норма часов">
              <input type="number" step="0.01" className="form-input" value={form.hCommercial} onChange={e => setForm(p => ({ ...p, hCommercial: parseFloat(e.target.value) || 0 }))} />
            </FormGroup>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Часы на единицу базы. Если база «Нет» — фиксированное количество часов.</p>
        </div>
      </Modal>

      {/* Confirm bulk save modal */}
      <Modal
        open={confirmSaveOpen}
        title="Сохранить нормативы?"
        onClose={() => setConfirmSaveOpen(false)}
        onSave={handleSaveAll}
        saveLabel={savingAll ? 'Сохранение...' : 'Применить ко всем расчётам'}
      >
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text2)' }}>
          Изменения будут применены к расчётам нагрузки во всех{' '}
          <strong style={{ color: 'var(--text)' }}>{activeContracts} активных договорах</strong>.
        </p>
        <div className="rounded-lg p-3.5 text-xs flex justify-between" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text3)' }}>Будет сохранено нормативов</span>
          <strong style={{ color: 'var(--accent)' }}>{dirtyCount}</strong>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message="Удалить эту задачу из нормативов?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

// Inline editable cell
function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => { if (!editing) setVal(value) }, [value, editing])
  if (editing) return (
    <input autoFocus className="form-input py-0.5 text-[11px]" style={{ minWidth: 120 }} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(val); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false) } if (e.key === 'Escape') setEditing(false) }} />
  )
  return <span className="cursor-pointer hover:text-[var(--text)] transition-colors" onClick={() => setEditing(true)}>{value}</span>
}

function EditableSelect({ value, options, onSave }: { value: string; options: string[]; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) return (
    <select autoFocus className="form-input py-0.5 text-[11px]" value={value}
      onChange={e => { onSave(e.target.value); setEditing(false) }}
      onBlur={() => setEditing(false)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
  return <span className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setEditing(true)}>{value}</span>
}

// Controlled number input that syncs to external value (for queued-edit flow)
function NumberCell({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  const [local, setLocal] = useState<string>(String(value))
  useEffect(() => { setLocal(String(value)) }, [value])
  return (
    <input
      type="number" step="0.01" min="0"
      value={local}
      className="form-input py-1 text-[11px]"
      style={{ width: 72, color }}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(local)
        const final = Number.isFinite(parsed) ? parsed : 0
        if (final !== value) onChange(final)
      }}
    />
  )
}
