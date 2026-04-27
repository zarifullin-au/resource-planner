'use client'
import { useState } from 'react'

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  onSave?: () => void
  saveLabel?: string
  children: React.ReactNode
}

export function Modal({ open, title, onClose, onSave, saveLabel = 'Сохранить', children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-[10px] p-7 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="font-head text-sm font-semibold mb-5">{title}</div>
        <div>{children}</div>
        <div className="flex gap-2.5 justify-end mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {onSave && (
            <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function Confirm({ open, message, onConfirm, onCancel }: ConfirmProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-[10px] p-7 w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="font-head text-sm font-semibold mb-4" style={{ color: 'var(--accent4)' }}>Подтверждение</div>
        <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text2)' }}
          dangerouslySetInnerHTML={{ __html: message }} />
        <div className="flex gap-2.5 justify-end">
          <button className="btn btn-danger" onClick={onConfirm}>Удалить</button>
          <button className="btn btn-ghost" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── Period Navigator ─────────────────────────────────────────────────────────
interface PeriodNavProps {
  offset: number
  months: { label: string }[]
  onShift: (delta: number) => void
  onReset: () => void
}

export function PeriodNav({ offset, months, onShift, onReset }: PeriodNavProps) {
  const from = months[0]?.label ?? ''
  const to = months[months.length - 1]?.label ?? ''
  const label = offset === 0
    ? `▸ Текущий период: ${from} — ${to}`
    : offset < 0
      ? `◂ Прошлый период: ${from} — ${to}  (сдвиг ${offset} мес)`
      : `▸ Будущий период: ${from} — ${to}  (сдвиг +${offset} мес)`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-widest mr-1" style={{ color: 'var(--text3)' }}>ПЕРИОД</span>
        <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => onShift(-1)}>
          <span className="text-sm">‹</span><span>−1 мес</span>
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: offset === 0 ? 'var(--accent)' : 'var(--text3)' }}
          onClick={onReset}
        >
          сегодня
        </button>
        <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => onShift(1)}>
          <span>+1 мес</span><span className="text-sm">›</span>
        </button>
      </div>
      <div className="text-[11px] tracking-wide" style={{ color: 'var(--accent)' }}>{label}</div>
    </div>
  )
}

// ─── Filter Buttons ───────────────────────────────────────────────────────────
interface FilterButtonsProps {
  options: { value: string; label: string; color?: string }[]
  value: string
  onChange: (v: string) => void
}

export function FilterButtons({ options, value, onChange }: FilterButtonsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => {
        const active = value === opt.value
        const col = opt.color || 'var(--text2)'
        return (
          <button
            key={opt.value}
            className="btn btn-sm"
            style={{
              border: `1px solid ${active ? col : 'var(--border)'}`,
              background: active ? `rgba(${hexToRgbStr(col)},0.12)` : 'transparent',
              color: active ? col : 'var(--text3)',
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function hexToRgbStr(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (r) return `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`
  // Handle CSS variables — fallback
  return '136,145,168'
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="font-head text-lg font-semibold mb-1">{title}</div>
        {sub && <div className="text-xs" style={{ color: 'var(--text2)' }}>{sub}</div>}
      </div>
      {right && <div className="flex-shrink-0 mt-1">{right}</div>}
    </div>
  )
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

// ─── Tag ─────────────────────────────────────────────────────────────────────
export function Tag({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'green' | 'purple' | 'orange' | 'gray' }) {
  return <span className={`tag tag-${variant}`}>{children}</span>
}
