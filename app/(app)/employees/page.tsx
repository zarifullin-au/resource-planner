'use client'
import { useState } from 'react'
import { useAppData } from '@/lib/useAppData'
import { Modal, Confirm, PageHeader, FormGroup, Tag } from '@/components/ui'
import { ROLES, EMPLOYEE_TYPES, ROLE_COLORS } from '@/lib/calc'
import { fetchJson, showError, confirmDuplicateName } from '@/lib/api'
import type { Employee } from '@/types'

const empty = (): Partial<Employee> => ({ name: '', role: 'Тимлид', type: 'Специалист', salary: 0 })

export default function EmployeesPage() {
  const { employees, refresh, loading } = useAppData()
  const [form, setForm] = useState<Partial<Employee>>(empty())
  const [editId, setEditId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openAdd() { setForm(empty()); setEditId(null); setModalOpen(true) }
  function openEdit(emp: Employee) { setForm({ ...emp }); setEditId(emp.id); setModalOpen(true) }

  async function handleSave() {
    if (!confirmDuplicateName(employees, form.name || '', editId, 'Сотрудник')) return
    setSaving(true)
    try {
      const url = editId ? `/api/employees/${editId}` : '/api/employees'
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
      await fetchJson(`/api/employees/${deleteId}`, { method: 'DELETE' })
      setDeleteId(null)
      refresh()
    } catch (e) {
      showError(e)
    }
  }

  const f = (field: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return <div className="text-xs py-8 text-center" style={{ color: 'var(--text3)' }}>Загрузка...</div>

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        sub="Справочник сотрудников"
        right={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Добавить</button>}
      />
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Имя', 'Роль', 'Тип', 'ЗП на руки, тыс.руб', ''].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase pb-2 px-3 border-b border-[var(--border)]" style={{ color: 'var(--text3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-[var(--surface2)] transition-colors">
                  <td className="px-3 py-2.5 font-medium border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text)' }}>{emp.name}</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]" style={{ color: ROLE_COLORS[emp.role] || '#aaa' }}>{emp.role}</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]"><Tag variant="gray">{emp.type}</Tag></td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]" style={{ color: 'var(--text2)' }}>{emp.salary}</td>
                  <td className="px-3 py-2.5 border-b border-[rgba(31,37,53,0.6)]">
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm px-2" onClick={() => openEdit(emp)}>✎</button>
                      <button className="btn btn-danger btn-sm px-2" onClick={() => setDeleteId(emp.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-xs" style={{ color: 'var(--text3)' }}>Нет сотрудников</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editId ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={() => setModalOpen(false)} onSave={handleSave} saveLabel={saving ? 'Сохранение...' : 'Сохранить'}>
        <div className="flex flex-col gap-3">
          <FormGroup label="Имя">
            <input className="form-input" value={form.name || ''} onChange={f('name')} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Роль">
              <select className="form-input" value={form.role || 'Тимлид'} onChange={f('role')}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Тип">
              <select className="form-input" value={form.type || 'Специалист'} onChange={f('type')}>
                {EMPLOYEE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label="ЗП на руки, тыс.руб">
            <input type="number" className="form-input" value={form.salary || 0} onChange={f('salary')} />
          </FormGroup>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message={`Удалить сотрудника «${employees.find(e => e.id === deleteId)?.name}»?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
