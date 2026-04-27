'use client'
import { useState, useEffect, useRef } from 'react'
import { useAppData } from '@/lib/useAppData'
import { Modal, Confirm, PageHeader, FormGroup, Tag } from '@/components/ui'
import { ROLES, SERVICES, STAGES, calcStageHours, ROLE_COLORS } from '@/lib/calc'
import { fetchJson, showError, confirmDuplicateName } from '@/lib/api'
import type { Contract, ContractStage } from '@/types'
import type { ContractDraftPayload } from '@/lib/slotFinder'

function emptyContract() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    name: '', objectId: '', service: 'ДПИ' as string, status: 'active',
    team: {} as Record<string, string>,
    stages: STAGES.map(stage => ({ stage, startDate: today, days: 20 })),
  }
}

export default function ContractsPage() {
  const { objects, employees, contracts, norms, settings, refresh, loading } = useAppData()
  const [form, setForm] = useState<ReturnType<typeof emptyContract>>(emptyContract())
  const [editId, setEditId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hoursId, setHoursId] = useState<{ contractId: string; stageIdx: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const draftConsumed = useRef(false)

  // Pre-fill from sessionStorage when arriving from /timeline slot finder.
  useEffect(() => {
    if (loading || draftConsumed.current) return
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('contractDraft') : null
    if (!raw) return
    draftConsumed.current = true
    sessionStorage.removeItem('contractDraft')

    let draft: ContractDraftPayload
    try {
      draft = JSON.parse(raw) as ContractDraftPayload
    } catch {
      return
    }

    const applyDraft = (objectId: string) => {
      setForm({
        name: draft.name,
        objectId,
        service: draft.service,
        status: 'active',
        team: Object.fromEntries(draft.team.map(t => [t.role, t.employeeId])),
        stages: STAGES.map(stageName => {
          const found = draft.stages.find(s => s.stage === stageName)
          return {
            stage: stageName,
            startDate: found?.startDate ?? new Date().toISOString().slice(0, 10),
            days: found?.days ?? 20,
          }
        }),
      })
      setEditId(null)
      setModalOpen(true)
    }

    if (draft.objectId) {
      applyDraft(draft.objectId)
    } else if (draft.objectDraft) {
      fetchJson<{ id: string }>('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.objectDraft),
      })
        .then(obj => {
          refresh()
          applyDraft(obj.id)
        })
        .catch(e => {
          showError(e)
          if (objects[0]) applyDraft(objects[0].id)
        })
    }
  }, [loading, objects, refresh])

  function openAdd() {
    if (!objects.length) { alert('Сначала добавьте объект'); return }
    setForm({ ...emptyContract(), objectId: objects[0].id })
    setEditId(null); setModalOpen(true)
  }

  function openEdit(c: Contract) {
    setForm({
      name: c.name, objectId: c.objectId, service: c.service, status: c.status,
      team: Object.fromEntries(c.team.map(t => [t.role, t.employeeId])),
      stages: STAGES.map(s => {
        const found = c.stages.find(st => st.stage === s)
        return { stage: s, startDate: found?.startDate ? found.startDate.slice(0, 10) : '', days: found?.days ?? 20 }
      }),
    })
    setEditId(c.id); setModalOpen(true)
  }

  async function handleSave() {
    if (!confirmDuplicateName(contracts, form.name, editId, 'Договор')) return
    setSaving(true)
    try {
      const url = editId ? `/api/contracts/${editId}` : '/api/contracts'
      await fetchJson(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setModalOpen(false)
      refresh()
    } catch (e) {
      showError(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await fetchJson(`/api/contracts/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      refresh()
    } catch (e) {
      showError(e)
    }
  }

  async function patchStage(stageId: string, patch: { startDate?: string; days?: number }) {
    try {
      await fetchJson(`/api/stages/${stageId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      refresh()
    } catch (e) {
      showError(e)
    }
  }

  if (loading) return <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>Загрузка...</div>

  return (
    <div>
      <PageHeader
        title="Договоры"
        sub="Управление договорами, командами и сроками этапов"
        right={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Добавить договор</button>}
      />

      {contracts.map(c => {
        const obj = objects.find(o => o.id === c.objectId)
        return (
          <div key={c.id} className="mb-3" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--surface2)' }}>
              <div className="flex-1">
                <div className="font-medium text-[13px]">{c.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  {obj?.name ?? '—'} · <span style={{ color: 'var(--accent)' }}>{c.service}</span>
                </div>
              </div>
              <Tag variant={c.status === 'done' ? 'gray' : 'green'}>{c.status === 'done' ? 'Завершён' : 'Активен'}</Tag>
              <button className="btn btn-ghost btn-sm px-2" onClick={() => openEdit(c)}>✎</button>
              <button className="btn btn-danger btn-sm px-2" onClick={() => setDeleteId(c.id)}>✕</button>
            </div>
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-1 mb-3">
                {c.team.map(t => {
                  const emp = employees.find(e => e.id === t.employeeId)
                  return (
                    <span key={t.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: ROLE_COLORS[t.role] || '#aaa' }}>
                      {t.role}: {emp?.name ?? '—'}
                    </span>
                  )
                })}
              </div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text3)' }}>
                Сроки этапов (начало / рабочих дней)
              </div>
              {STAGES.map((stageName, si) => {
                const stg = c.stages.find(s => s.stage === stageName)
                return (
                  <StageRow
                    key={stageName}
                    stageName={stageName}
                    stage={stg}
                    onPatch={patch => stg && patchStage(stg.id, patch)}
                    onShowHours={() => setHoursId({ contractId: c.id, stageIdx: si })}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {contracts.length === 0 && (
        <div className="card text-center py-8 text-xs" style={{ color: 'var(--text3)' }}>Нет договоров. Добавьте первый!</div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={editId ? 'Редактировать договор' : 'Новый договор'} onClose={() => setModalOpen(false)} onSave={handleSave} saveLabel={saving ? 'Сохранение...' : 'Сохранить'}>
        <div className="flex flex-col gap-3">
          <FormGroup label="Название договора">
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Объект">
              <select className="form-input" value={form.objectId} onChange={e => setForm(p => ({ ...p, objectId: e.target.value }))}>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Вид услуги">
              <select className="form-input" value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormGroup>
          </div>

          <div className="text-[10px] uppercase tracking-widest pt-2 pb-1" style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>Команда</div>
          {ROLES.map(role => (
            <div key={role} className="flex items-center gap-3">
              <span className="text-[11px] w-28" style={{ color: ROLE_COLORS[role] || '#aaa' }}>{role}</span>
              <select
                className="form-input flex-1"
                value={form.team[role] || ''}
                onChange={e => setForm(p => ({ ...p, team: { ...p.team, [role]: e.target.value } }))}
              >
                <option value="">— не назначен —</option>
                {employees.filter(em => em.role === role).map(em => (
                  <option key={em.id} value={em.id}>{em.name}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="text-[10px] uppercase tracking-widest pt-2 pb-1" style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>Сроки этапов</div>
          {form.stages.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-2">
              <span className="text-[11px] w-14 flex-shrink-0" style={{ color: 'var(--text2)' }}>{s.stage}</span>
              <input type="date" className="form-input text-[11px] py-1" style={{ width: 140 }} value={s.startDate}
                onChange={e => setForm(p => ({ ...p, stages: p.stages.map((st, idx) => idx === i ? { ...st, startDate: e.target.value } : st) }))} />
              <input type="number" className="form-input text-[11px] py-1" style={{ width: 72 }} value={s.days} min={1}
                onChange={e => setForm(p => ({ ...p, stages: p.stages.map((st, idx) => idx === i ? { ...st, days: parseInt(e.target.value) || 20 } : st) }))} />
              <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text3)' }}>р.дней</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Hours breakdown modal */}
      {hoursId && (() => {
        const c = contracts.find(c => c.id === hoursId.contractId)
        const obj = objects.find(o => o.id === c?.objectId)
        if (!c || !obj) return null
        const hours = calcStageHours(c, hoursId.stageIdx, obj, employees, norms, settings)
        const total = Object.values(hours).reduce((a, b) => a + b, 0)
        return (
          <Modal open title={`Трудоёмкость: ${c.name} / ${STAGES[hoursId.stageIdx]}`} onClose={() => setHoursId(null)}>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>{['Роль', 'Сотрудник', 'Часов', 'Дней'].map(h => (
                  <th key={h} className="text-left pb-2 pr-3 text-[10px] uppercase tracking-widest border-b border-[var(--border)]" style={{ color: 'var(--text3)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {Object.entries(hours).map(([role, h]) => {
                  const teamEntry = c.team.find(t => t.role === role)
                  const emp = employees.find(e => e.id === teamEntry?.employeeId)
                  return (
                    <tr key={role} className="border-b border-[rgba(31,37,53,0.5)]">
                      <td className="py-2 pr-3" style={{ color: ROLE_COLORS[role] || '#aaa' }}>{role}</td>
                      <td className="py-2 pr-3" style={{ color: 'var(--text2)' }}>{emp?.name ?? '—'}</td>
                      <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{Math.round(h * 10) / 10}</td>
                      <td className="py-2" style={{ color: 'var(--text2)' }}>{Math.round(h / settings.hoursDay * 10) / 10}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="py-2 font-semibold">Итого</td>
                  <td className="py-2 font-semibold" style={{ color: 'var(--accent)' }}>{Math.round(total * 10) / 10}</td>
                  <td className="py-2" style={{ color: 'var(--text2)' }}>{Math.round(total / settings.hoursDay * 10) / 10}</td>
                </tr>
              </tfoot>
            </table>
          </Modal>
        )
      })()}

      <Confirm
        open={!!deleteId}
        message={`Удалить договор «${contracts.find(c => c.id === deleteId)?.name}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function StageRow({
  stageName,
  stage,
  onPatch,
  onShowHours,
}: {
  stageName: string
  stage: ContractStage | undefined
  onPatch: (patch: { startDate?: string; days?: number }) => void
  onShowHours: () => void
}) {
  const initialDate = stage?.startDate?.slice(0, 10) ?? ''
  const initialDays = stage?.days ?? 20
  const [date, setDate] = useState(initialDate)
  const [days, setDays] = useState<number>(initialDays)

  useEffect(() => { setDate(initialDate) }, [initialDate])
  useEffect(() => { setDays(initialDays) }, [initialDays])

  const disabled = !stage

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-[rgba(31,37,53,0.4)] last:border-b-0">
      <span className="text-[11px] w-14" style={{ color: 'var(--text2)' }}>{stageName}</span>
      <input
        type="date"
        value={date}
        disabled={disabled}
        className="form-input text-[11px] py-1"
        style={{ width: 140 }}
        onChange={e => setDate(e.target.value)}
        onBlur={() => { if (date !== initialDate) onPatch({ startDate: date }) }}
      />
      <input
        type="number"
        value={days}
        min={1}
        disabled={disabled}
        className="form-input text-[11px] py-1"
        style={{ width: 72 }}
        onChange={e => setDays(parseInt(e.target.value) || 0)}
        onBlur={() => { if (days !== initialDays) onPatch({ days }) }}
      />
      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>рабочих дней</span>
      <button
        className="btn btn-ghost btn-sm text-[10px] px-2 ml-auto"
        style={{ color: 'var(--accent)' }}
        onClick={onShowHours}
      >
        ⊞ часы
      </button>
    </div>
  )
}
