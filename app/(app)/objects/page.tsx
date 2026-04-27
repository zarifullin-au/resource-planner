'use client'
import { useState } from 'react'
import { useAppData } from '@/lib/useAppData'
import { Modal, Confirm, PageHeader, FormGroup, Tag } from '@/components/ui'
import { OBJECT_TYPES, COMPLEXITY_TYPES } from '@/lib/calc'
import { fetchJson, showError, confirmDuplicateName } from '@/lib/api'
import type { ProjectObject } from '@/types'

const empty = (): Partial<ProjectObject> => ({
  code: '', name: '', type: 'Жилой', complexity: 'Стандартный',
  area: 0, roomsMain: 0, roomsAux: 0, roomsTech: 0, roomsIii: 0,
})

export default function ObjectsPage() {
  const { objects, contracts, refresh, loading } = useAppData()
  const [form, setForm] = useState<Partial<ProjectObject>>(empty())
  const [editId, setEditId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openAdd() { setForm(empty()); setEditId(null); setModalOpen(true) }
  function openEdit(obj: ProjectObject) { setForm({ ...obj }); setEditId(obj.id); setModalOpen(true) }

  async function handleSave() {
    if (!confirmDuplicateName(objects, form.name || '', editId, 'Объект')) return
    setSaving(true)
    try {
      const url = editId ? `/api/objects/${editId}` : '/api/objects'
      const method = editId ? 'PUT' : 'POST'
      await fetchJson(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
      await fetchJson(`/api/objects/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      refresh()
    } catch (e) {
      showError(e)
    }
  }

  const f = (field: keyof ProjectObject) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>Загрузка...</div>

  return (
    <div>
      <PageHeader
        title="Объекты"
        sub="Управление проектными объектами"
        right={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Добавить объект</button>}
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Код', 'Название', 'Вид', 'Сложность', 'Площадь, м²', 'Комнаты (осн/вспом/тех)', ''].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase pb-2 px-3 border-b border-[var(--border)]" style={{ color: 'var(--text3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objects.map(obj => (
                <tr key={obj.id} className="hover:bg-[var(--surface2)] transition-colors">
                  <td className="px-3 py-2.5 text-[11px] font-mono border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text3)' }}>{obj.code || '—'}</td>
                  <td className="px-3 py-2.5 font-medium border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text)' }}>{obj.name}</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]">
                    <Tag variant={obj.type === 'Жилой' ? 'green' : 'purple'}>{obj.type}</Tag>
                  </td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]">
                    <Tag variant="gray">{obj.complexity}</Tag>
                  </td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text2)' }}>{obj.area} м²</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text2)' }}>{obj.roomsMain} / {obj.roomsAux} / {obj.roomsTech}</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]">
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm px-2" onClick={() => openEdit(obj)}>✎</button>
                      <button className="btn btn-danger btn-sm px-2" onClick={() => setDeleteId(obj.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {objects.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-xs" style={{ color: 'var(--text3)' }}>Объектов нет</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editId ? 'Редактировать объект' : 'Новый объект'} onClose={() => setModalOpen(false)} onSave={handleSave} saveLabel={saving ? 'Сохранение...' : 'Сохранить'}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Код объекта">
              <input className="form-input font-mono tracking-wide" value={form.code || ''} onChange={f('code')} placeholder="OBJ-001" />
            </FormGroup>
            <FormGroup label="Название объекта">
              <input className="form-input" value={form.name || ''} onChange={f('name')} />
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Вид объекта">
              <select className="form-input" value={form.type || 'Жилой'} onChange={f('type')}>
                {OBJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Сложность">
              <select className="form-input" value={form.complexity || 'Стандартный'} onChange={f('complexity')}>
                {COMPLEXITY_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Площадь, м²">
              <input type="number" className="form-input" value={form.area || 0} onChange={f('area')} />
            </FormGroup>
            <FormGroup label="Позиций ИИИ">
              <input type="number" className="form-input" value={form.roomsIii || 0} onChange={f('roomsIii')} />
            </FormGroup>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormGroup label="Осн. комнаты">
              <input type="number" className="form-input" value={form.roomsMain || 0} onChange={f('roomsMain')} />
            </FormGroup>
            <FormGroup label="Вспомогат.">
              <input type="number" className="form-input" value={form.roomsAux || 0} onChange={f('roomsAux')} />
            </FormGroup>
            <FormGroup label="Технические">
              <input type="number" className="form-input" value={form.roomsTech || 0} onChange={f('roomsTech')} />
            </FormGroup>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message={(() => {
          const obj = objects.find(o => o.id === deleteId)
          const related = contracts.filter(c => c.objectId === deleteId)
          const warn = related.length > 0
            ? `<br><span style="color:var(--accent4)">⚠ Будет также удалено договоров: ${related.length}${related.length > 0 ? ' — ' + related.map(c => '«' + c.name + '»').join(', ') : ''}</span>`
            : ''
          return `Удалить объект «${obj?.name}»?${warn}`
        })()}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
