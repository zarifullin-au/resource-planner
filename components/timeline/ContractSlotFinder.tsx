'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormGroup } from '@/components/ui'
import {
  ROLES, SERVICES, STAGES, OBJECT_TYPES, COMPLEXITY_TYPES, ROLE_COLORS,
} from '@/lib/calc'
import {
  findSlots, buildDraftContract, isoDate,
  type SlotResult, type SlotCandidate, type ContractDraftPayload,
} from '@/lib/slotFinder'
import type {
  AppSettings, Contract, Employee, LoadResult, MonthData, Norm, ProjectObject, ServiceType,
} from '@/types'

export interface SlotDraftPreview {
  contract: Contract
  object: ProjectObject
  service: ServiceType
}

interface Props {
  objects: ProjectObject[]
  employees: Employee[]
  contracts: Contract[]
  norms: Norm[]
  settings: AppSettings
  months: MonthData[]
  effectiveLoad: LoadResult
  onDraftChange: (d: SlotDraftPreview | null) => void
}

const EMPTY_OBJECT_DRAFT = {
  name: '',
  type: 'Жилой' as string,
  complexity: 'Стандартный' as string,
  area: 100,
  roomsMain: 3,
  roomsAux: 1,
  roomsTech: 1,
  roomsIii: 0,
}

export function ContractSlotFinder({
  objects, employees, contracts, norms, settings, months, effectiveLoad, onDraftChange,
}: Props) {
  const router = useRouter()

  const [service, setService] = useState<ServiceType>('ДПИ')
  const [useExisting, setUseExisting] = useState(false)
  const [objectId, setObjectId] = useState(objects[0]?.id ?? '')
  const [objectDraft, setObjectDraft] = useState({ ...EMPTY_OBJECT_DRAFT })
  const [stageDays, setStageDays] = useState<number[]>(STAGES.map(() => 20))
  const [desiredStart, setDesiredStart] = useState(isoDate(new Date()))
  const [contractName, setContractName] = useState('')
  const [result, setResult] = useState<SlotResult | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (useExisting && !objectId && objects[0]) setObjectId(objects[0].id)
  }, [useExisting, objectId, objects])

  const normsForService = useMemo(
    () => norms.filter(n => n.service === service),
    [norms, service],
  )

  const formObject: ProjectObject = useMemo(() => {
    if (useExisting) {
      const found = objects.find(o => o.id === objectId)
      if (found) return found
    }
    return {
      id: '__draft__',
      name: objectDraft.name || 'Новый объект',
      type: objectDraft.type as ProjectObject['type'],
      complexity: objectDraft.complexity as ProjectObject['complexity'],
      area: objectDraft.area,
      roomsMain: objectDraft.roomsMain,
      roomsAux: objectDraft.roomsAux,
      roomsTech: objectDraft.roomsTech,
      roomsIii: objectDraft.roomsIii,
    }
  }, [useExisting, objectId, objects, objectDraft])

  const canSubmit = service && normsForService.length > 0 && (
    useExisting ? !!objectId : objectDraft.name.trim().length > 0
  )

  function handleFind() {
    const r = findSlots({
      service,
      object: formObject,
      stageDays,
      desiredStart: new Date(desiredStart),
      contracts,
      objects,
      employees,
      norms,
      settings,
    })
    setResult(r)
    setSelectedIdx(0)
  }

  // Push selected candidate to parent for Block 1 preview + load mix-in.
  useEffect(() => {
    if (!result?.primary) {
      onDraftChange(null)
      return
    }
    const all = [result.primary, ...result.alternatives]
    const cand = all[selectedIdx] || all[0]
    const draftContract = buildDraftContract(cand, service, formObject.id)
    onDraftChange({ contract: draftContract, object: formObject, service })
  }, [result, selectedIdx, service, formObject, onDraftChange])

  // Reset draft on unmount.
  useEffect(() => () => onDraftChange(null), [onDraftChange])

  function handleCreateContract() {
    if (!result?.primary) return
    setSubmitting(true)
    const all = [result.primary, ...result.alternatives]
    const cand = all[selectedIdx] || all[0]
    const payload: ContractDraftPayload = {
      name: contractName.trim() || `${formObject.name} · ${service}`,
      objectId: useExisting ? objectId : null,
      objectDraft: useExisting ? undefined : { ...objectDraft },
      service,
      team: cand.team.map(t => ({ role: t.role, employeeId: t.employeeId })),
      stages: cand.stages.map(s => ({
        stage: s.stage,
        startDate: isoDate(s.start),
        days: s.days,
      })),
    }
    sessionStorage.setItem('contractDraft', JSON.stringify(payload))
    router.push('/contracts')
  }

  return (
    <div className="card">
      <div className="font-head font-semibold tracking-wide text-xs mb-4" style={{ color: 'var(--text2)' }}>
        ПОДБОР СЛОТА ДЛЯ НОВОГО ДОГОВОРА
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left column: service + object */}
        <div className="flex flex-col gap-3">
          <FormGroup label="Услуга">
            <select
              className="form-input"
              value={service}
              onChange={e => setService(e.target.value as ServiceType)}
            >
              {SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormGroup>

          <div className="flex flex-col gap-2">
            <label className="form-label">Объект</label>
            <div className="flex gap-3 text-[11px]" style={{ color: 'var(--text2)' }}>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={!useExisting}
                  onChange={() => setUseExisting(false)}
                />
                Новый
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={useExisting}
                  onChange={() => setUseExisting(true)}
                  disabled={objects.length === 0}
                />
                Существующий
              </label>
            </div>

            {useExisting ? (
              <select
                className="form-input"
                value={objectId}
                onChange={e => setObjectId(e.target.value)}
              >
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  className="form-input"
                  placeholder="Название объекта"
                  value={objectDraft.name}
                  onChange={e => setObjectDraft(p => ({ ...p, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="form-input"
                    value={objectDraft.type}
                    onChange={e => setObjectDraft(p => ({ ...p, type: e.target.value }))}
                  >
                    {OBJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select
                    className="form-input"
                    value={objectDraft.complexity}
                    onChange={e => setObjectDraft(p => ({ ...p, complexity: e.target.value }))}
                  >
                    {COMPLEXITY_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField label="Площадь, м²" value={objectDraft.area} onChange={v => setObjectDraft(p => ({ ...p, area: v }))} />
                  <NumField label="Комнаты основные" value={objectDraft.roomsMain} onChange={v => setObjectDraft(p => ({ ...p, roomsMain: v }))} />
                  <NumField label="Комнаты вспом." value={objectDraft.roomsAux} onChange={v => setObjectDraft(p => ({ ...p, roomsAux: v }))} />
                  <NumField label="Комнаты технич." value={objectDraft.roomsTech} onChange={v => setObjectDraft(p => ({ ...p, roomsTech: v }))} />
                  <NumField label="Позиции ИИИ" value={objectDraft.roomsIii} onChange={v => setObjectDraft(p => ({ ...p, roomsIii: v }))} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: stages + start + button */}
        <div className="flex flex-col gap-3">
          <FormGroup label="Название договора (опционально)">
            <input
              className="form-input"
              placeholder={`${formObject.name || '...'} · ${service}`}
              value={contractName}
              onChange={e => setContractName(e.target.value)}
            />
          </FormGroup>

          <div className="flex flex-col gap-2">
            <label className="form-label">Длительность этапов (раб. дней)</label>
            {STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="text-[11px] w-14" style={{ color: 'var(--text2)' }}>{stage}</span>
                <input
                  type="number"
                  min={1}
                  className="form-input text-[11px] py-1"
                  style={{ width: 80 }}
                  value={stageDays[i]}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1
                    setStageDays(p => p.map((d, idx) => idx === i ? v : d))
                  }}
                />
                <span className="text-[10px]" style={{ color: 'var(--text3)' }}>раб. дней</span>
              </div>
            ))}
          </div>

          <FormGroup label="Желаемая дата старта">
            <input
              type="date"
              className="form-input"
              style={{ width: 160 }}
              value={desiredStart}
              onChange={e => setDesiredStart(e.target.value)}
            />
          </FormGroup>

          {normsForService.length === 0 && (
            <div className="text-[11px] px-3 py-2 rounded" style={{ background: 'rgba(245,168,74,0.08)', color: 'var(--accent3)' }}>
              ⚠ Для услуги «{service}» не заданы нормы. Заполните их в разделе «Нормы часов».
            </div>
          )}

          <button
            className="btn btn-primary self-start mt-2"
            disabled={!canSubmit}
            onClick={handleFind}
          >
            ✓ Подобрать слот
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <ResultPanel
            result={result}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            employees={employees}
            settings={settings}
            months={months}
            effectiveLoad={effectiveLoad}
            onCreate={handleCreateContract}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{label}</span>
      <input
        type="number"
        min={0}
        className="form-input text-[11px] py-1"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}

interface ResultPanelProps {
  result: SlotResult
  selectedIdx: number
  onSelect: (i: number) => void
  employees: Employee[]
  settings: AppSettings
  months: MonthData[]
  effectiveLoad: LoadResult
  onCreate: () => void
  submitting: boolean
}

function ResultPanel({
  result, selectedIdx, onSelect, employees, settings, months, effectiveLoad, onCreate, submitting,
}: ResultPanelProps) {
  if (!result.primary) {
    return (
      <div className="text-xs" style={{ color: 'var(--text2)' }}>
        <div className="font-semibold mb-2" style={{ color: 'var(--accent4)' }}>
          {result.noSlotReason || 'Слот не найден'}
        </div>
        {result.bottleneck && (
          <div className="text-[11px]">
            Узкое место: <span style={{ color: 'var(--accent3)' }}>{result.bottleneck.role}</span>
            {' '}— дефицит ≈ {result.bottleneck.shortageH} ч.
          </div>
        )}
      </div>
    )
  }

  const all = [result.primary, ...result.alternatives]
  const cand = all[selectedIdx] || all[0]

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {all.map((_, i) => {
          const active = i === selectedIdx
          const label = i === 0 ? 'Главное' : `Альтернатива ${i}`
          return (
            <button
              key={i}
              className="btn btn-sm"
              style={{
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'rgba(26,107,255,0.08)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
              }}
              onClick={() => onSelect(i)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="Старт" value={formatDate(cand.startDate)} accent="var(--accent)" />
        <Stat label="Окончание" value={formatDate(cand.endDate)} />
        <Stat
          label="Длительность"
          value={`${cand.stages.reduce((sum, s) => sum + s.days, 0)} раб. дн.`}
        />
      </div>

      <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>КОМАНДА</div>
      <div className="flex flex-col gap-1.5 mb-5">
        {cand.team.map(t => {
          const emp = employees.find(e => e.id === t.employeeId)
          const tight = t.requiredH > t.freeH * 0.8
          return (
            <div key={t.role} className="flex items-center gap-3 text-[11px]">
              <span className="w-28" style={{ color: ROLE_COLORS[t.role] || 'var(--text2)' }}>
                {t.role}
              </span>
              <span className="flex-1" style={{ color: 'var(--text)' }}>
                {emp ? `${emp.name} (${emp.type})` : '—'}
              </span>
              <span style={{ color: tight ? 'var(--accent3)' : 'var(--text3)' }}>
                нужно {t.requiredH} ч / свободно {t.freeH} ч
              </span>
            </div>
          )
        })}
      </div>

      <div className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
        ЗАГРУЗКА КОМАНДЫ ПО МЕСЯЦАМ (С УЧЁТОМ ЭТОГО ДОГОВОРА)
      </div>
      <div className="grid mb-1 text-[10px]" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)`, color: 'var(--text3)' }}>
        <div />
        {months.map(m => <div key={m.key} className="text-center">{m.label}</div>)}
      </div>
      {cand.team.map(t => {
        const emp = employees.find(e => e.id === t.employeeId)
        if (!emp) return null
        return (
          <div key={t.role} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
            <div className="pr-2 truncate">
              <div className="text-[11px]" style={{ color: 'var(--text)' }}>{emp.name}</div>
              <div className="text-[9px]" style={{ color: ROLE_COLORS[t.role] || 'var(--text3)' }}>{t.role}</div>
            </div>
            {months.map(m => {
              const loaded = effectiveLoad[emp.id]?.[m.key] || 0
              const pct = settings.hoursMonth > 0 ? Math.round(loaded / settings.hoursMonth * 100) : 0
              return <LoadCell key={m.key} pct={pct} hours={Math.round(loaded)} />
            })}
          </div>
        )
      })}

      <button
        className="btn btn-primary mt-5"
        onClick={onCreate}
        disabled={submitting}
      >
        {submitting ? 'Переход…' : '✓ Создать договор с этим составом'}
      </button>
    </div>
  )
}

function LoadCell({ pct, hours }: { pct: number; hours: number }) {
  let bg = 'rgba(26,107,255,0.10)'
  let fg = 'var(--accent)'
  if (pct >= 100) {
    bg = 'rgba(245,106,106,0.18)'
    fg = 'var(--accent4)'
  } else if (pct >= 80) {
    bg = 'rgba(245,168,74,0.16)'
    fg = 'var(--accent3)'
  }
  return (
    <div
      className="rounded-md flex flex-col items-center justify-center"
      style={{ height: 38, background: bg }}
    >
      <span className="text-[11px] font-semibold" style={{ color: fg }}>{pct}%</span>
      <span className="text-[9px]" style={{ color: fg, opacity: 0.7 }}>{hours} ч</span>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>{label}</div>
      <div className="text-[14px] font-semibold mt-1" style={{ color: accent || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}
