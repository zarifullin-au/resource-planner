import type {
  AppSettings, Contract, Employee, Norm, ProjectObject, ServiceType,
} from '@/types'
import {
  STAGES, ROLES, getComplexityK, getTypeK, addWorkingDays, countWorkingDays, calcLoad,
} from '@/lib/calc'
import { buildHolidaySet } from '@/lib/holidays'

export interface SlotInput {
  service: ServiceType
  object: ProjectObject
  stageDays: number[]
  desiredStart: Date
  contracts: Contract[]
  objects: ProjectObject[]
  employees: Employee[]
  norms: Norm[]
  settings: AppSettings
}

export interface SlotStage {
  stage: string
  start: Date
  end: Date
  days: number
}

export interface SlotTeamEntry {
  role: string
  employeeId: string
  requiredH: number
  freeH: number
}

export interface SlotCandidate {
  startDate: Date
  endDate: Date
  stages: SlotStage[]
  team: SlotTeamEntry[]
}

export interface SlotResult {
  primary: SlotCandidate | null
  alternatives: SlotCandidate[]
  bottleneck?: { role: string; shortageH: number }
  noSlotReason?: string
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthsBetween(start: Date, end: Date): string[] {
  const keys: string[] = []
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (d <= last) {
    keys.push(monthKey(d))
    d.setMonth(d.getMonth() + 1)
  }
  return keys
}

function getRoleHoursForStage(
  service: ServiceType,
  stageName: string,
  object: ProjectObject,
  norms: Norm[],
  settings: AppSettings,
): Record<string, number> {
  const isResidential = object.type === 'Жилой'
  const kC = getComplexityK(object.complexity, settings)
  const result: Record<string, number> = {}
  const stageNorms = norms.filter(n => n.service === service && n.stage === stageName)

  for (const n of stageNorms) {
    let baseVal = 1
    if (n.base === 'Площадь объекта') baseVal = object.area || 0
    else if (n.base === 'Кол-во комнат основные') baseVal = object.roomsMain || 0
    else if (n.base === 'Кол-во комнат вспомагательные') baseVal = object.roomsAux || 0
    else if (n.base === 'Кол-во комнат технические') baseVal = object.roomsTech || 0
    else if (n.base === 'Кол-во позиций ИИИ') baseVal = object.roomsIii || 0

    const hPerUnit = isResidential ? n.hResidential : n.hCommercial
    // kT = 1.0 baseline (as if the role is filled by a Специалист); recomputed once team is known.
    const hours = baseVal * hPerUnit * kC * 1.0
    result[n.role] = (result[n.role] || 0) + hours
  }
  return result
}

function distributeHoursAcrossMonths(
  stageStart: Date,
  stageEnd: Date,
  totalHours: number,
  holidays: Set<string>,
): Record<string, number> {
  const out: Record<string, number> = {}
  const totalWD = countWorkingDays(stageStart, stageEnd, holidays) || 1
  const keys = monthsBetween(stageStart, stageEnd)
  for (const key of keys) {
    const [yStr, mStr] = key.split('-')
    const y = parseInt(yStr, 10)
    const m = parseInt(mStr, 10) - 1
    const mStart = new Date(y, m, 1)
    const mEnd = new Date(y, m + 1, 0)
    const overlapStart = stageStart > mStart ? stageStart : mStart
    const overlapEnd = stageEnd < mEnd ? stageEnd : mEnd
    if (overlapStart > overlapEnd) continue
    const overlapWD = countWorkingDays(overlapStart, overlapEnd, holidays)
    out[key] = (out[key] || 0) + (totalHours * overlapWD) / totalWD
  }
  return out
}

function buildScheduleStages(
  startDate: Date,
  stageDays: number[],
  holidays: Set<string>,
): SlotStage[] {
  const out: SlotStage[] = []
  let cursor = new Date(startDate)
  for (let i = 0; i < STAGES.length; i++) {
    const days = stageDays[i] || 20
    const start = new Date(cursor)
    const end = addWorkingDays(start, days, holidays)
    out.push({ stage: STAGES[i], start, end, days })
    cursor = addWorkingDays(end, 1, holidays)
  }
  return out
}

function findFirstWorkingDay(d: Date, holidays: Set<string>): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  while (true) {
    const dow = r.getDay()
    const iso = `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`
    if (dow !== 0 && dow !== 6 && !holidays.has(iso)) return r
    r.setDate(r.getDate() + 1)
  }
}

function pickKtForEmployee(emp: Employee, settings: AppSettings): number {
  return getTypeK(emp.type, settings)
}

function totalRequiredAcrossStages(reqByStageRole: Record<string, number>[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const stage of reqByStageRole) {
    for (const [role, h] of Object.entries(stage)) {
      totals[role] = (totals[role] || 0) + h
    }
  }
  return totals
}

interface FreeMap { [empId: string]: { [monthKey: string]: number } }

function computeBaselineFree(
  contracts: Contract[],
  objects: ProjectObject[],
  employees: Employee[],
  norms: Norm[],
  settings: AppSettings,
  monthKeys: string[],
): FreeMap {
  const load = calcLoad(contracts, objects, employees, norms, settings, 0)
  const free: FreeMap = {}
  for (const e of employees) {
    free[e.id] = {}
    for (const k of monthKeys) {
      free[e.id][k] = Math.max(0, settings.hoursMonth - (load[e.id]?.[k] || 0))
    }
  }
  return free
}

function tryAssignTeam(
  reqByStageRole: Record<string, number>[],
  stages: SlotStage[],
  employees: Employee[],
  baselineFree: FreeMap,
  settings: AppSettings,
  holidays: Set<string>,
  excludeEmpIds: Set<string>,
): { team: SlotTeamEntry[]; bottleneck?: { role: string; shortageH: number } } | null {
  const totals = totalRequiredAcrossStages(reqByStageRole)
  const roleNames = Object.keys(totals)
  if (roleNames.length === 0) return null

  // Per-role required hours per month (sum across stages).
  const requiredByRoleMonth: Record<string, Record<string, number>> = {}
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]
    const stageReq = reqByStageRole[i]
    for (const [role, h] of Object.entries(stageReq)) {
      const dist = distributeHoursAcrossMonths(s.start, s.end, h, holidays)
      requiredByRoleMonth[role] = requiredByRoleMonth[role] || {}
      for (const [k, v] of Object.entries(dist)) {
        requiredByRoleMonth[role][k] = (requiredByRoleMonth[role][k] || 0) + v
      }
    }
  }

  const team: SlotTeamEntry[] = []
  const used = new Set(excludeEmpIds)
  let worstBottleneck: { role: string; shortageH: number } | undefined

  // Order roles by total required hours descending — fill heaviest roles first.
  const orderedRoles = [...roleNames].sort((a, b) => (totals[b] || 0) - (totals[a] || 0))

  for (const role of orderedRoles) {
    const reqMonths = requiredByRoleMonth[role] || {}
    const candidates = employees
      .filter(e => e.role === role && !used.has(e.id))
      .map(e => {
        const kT = pickKtForEmployee(e, settings)
        // Scale required hours by employee's kT (since baseline used kT=1.0).
        let monthlyOk = true
        let totalShortage = 0
        let totalFree = 0
        let totalReq = 0
        for (const [k, baseReq] of Object.entries(reqMonths)) {
          const req = baseReq * kT
          const free = baselineFree[e.id]?.[k] || 0
          totalFree += free
          totalReq += req
          if (free < req - 1e-6) {
            monthlyOk = false
            totalShortage += (req - free)
          }
        }
        return { emp: e, kT, monthlyOk, totalShortage, totalFree, totalReq }
      })
      .sort((a, b) => {
        // Prefer fits, then higher seniority (lower kT = ведущий → меньше часов нужно), then more free.
        if (a.monthlyOk && !b.monthlyOk) return -1
        if (!a.monthlyOk && b.monthlyOk) return 1
        if (a.kT !== b.kT) return a.kT - b.kT
        return b.totalFree - a.totalFree
      })

    const fit = candidates.find(c => c.monthlyOk)
    if (!fit) {
      const shortage = candidates.length > 0 ? candidates[0].totalShortage : (totals[role] || 0)
      if (!worstBottleneck || shortage > worstBottleneck.shortageH) {
        worstBottleneck = { role, shortageH: Math.round(shortage) }
      }
      return { team: [], bottleneck: worstBottleneck }
    }

    used.add(fit.emp.id)
    team.push({
      role,
      employeeId: fit.emp.id,
      requiredH: Math.round(fit.totalReq),
      freeH: Math.round(fit.totalFree),
    })
  }

  return { team }
}

const ONE_DAY = 24 * 60 * 60 * 1000
const MAX_HORIZON_DAYS = 180
const STEP_DAYS = 7

export function findSlots(input: SlotInput): SlotResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const requested = new Date(input.desiredStart)
  requested.setHours(0, 0, 0, 0)
  const start0 = requested < today ? today : requested

  const fromYear = start0.getFullYear() - 1
  const toYear = start0.getFullYear() + 2
  const holidays = buildHolidaySet(fromYear, toYear, input.settings.customHolidays ?? [])

  const reqByStageRole = STAGES.map((stageName) =>
    getRoleHoursForStage(input.service, stageName, input.object, input.norms, input.settings),
  )
  const allRoles = new Set<string>()
  for (const stage of reqByStageRole) {
    for (const role of Object.keys(stage)) allRoles.add(role)
  }
  if (allRoles.size === 0) {
    return {
      primary: null,
      alternatives: [],
      noSlotReason: `Для услуги «${input.service}» не заданы нормы. Заполните нормативы.`,
    }
  }

  // Compute month keys once based on the longest possible window starting from start0.
  const horizonEnd = new Date(start0.getTime() + (MAX_HORIZON_DAYS + 365) * ONE_DAY)
  const monthKeys = monthsBetween(start0, horizonEnd)
  const baselineFree = computeBaselineFree(
    input.contracts, input.objects, input.employees, input.norms, input.settings, monthKeys,
  )

  const candidates: SlotCandidate[] = []
  let lastBottleneck: { role: string; shortageH: number } | undefined
  let primary: SlotCandidate | null = null
  const usedTeams: Set<string> = new Set()

  for (let dayOffset = 0; dayOffset <= MAX_HORIZON_DAYS; dayOffset += STEP_DAYS) {
    const candidateStartRaw = new Date(start0.getTime() + dayOffset * ONE_DAY)
    const candidateStart = findFirstWorkingDay(candidateStartRaw, holidays)
    const stages = buildScheduleStages(candidateStart, input.stageDays, holidays)
    const endDate = stages[stages.length - 1].end

    // Try to find primary, then 2 alternatives with different teams or different start dates.
    const result = tryAssignTeam(
      reqByStageRole, stages, input.employees, baselineFree, input.settings, holidays, new Set(),
    )
    if (!result) break
    if (result.bottleneck) {
      lastBottleneck = result.bottleneck
      continue
    }
    if (result.team.length === 0) continue

    const teamKey = result.team
      .map(t => `${t.role}:${t.employeeId}`)
      .sort()
      .join('|')
    const dateKey = candidateStart.toISOString().slice(0, 10)
    const dedupeKey = `${dateKey}::${teamKey}`
    if (usedTeams.has(dedupeKey)) continue
    usedTeams.add(dedupeKey)

    const cand: SlotCandidate = {
      startDate: candidateStart,
      endDate,
      stages,
      team: result.team,
    }
    if (!primary) {
      primary = cand
    } else {
      candidates.push(cand)
      if (candidates.length >= 2) break
    }
  }

  return {
    primary,
    alternatives: candidates,
    bottleneck: primary ? undefined : lastBottleneck,
    noSlotReason: primary
      ? undefined
      : 'В ближайшие 6 месяцев нет окна для договора с такими параметрами.',
  }
}

export interface ContractDraftPayload {
  name: string
  objectId: string | null
  objectDraft?: {
    name: string
    type: string
    complexity: string
    area: number
    roomsMain: number
    roomsAux: number
    roomsTech: number
    roomsIii: number
  }
  service: ServiceType
  team: { role: string; employeeId: string }[]
  stages: { stage: string; startDate: string; days: number }[]
}

export function buildDraftContract(
  candidate: SlotCandidate,
  service: ServiceType,
  objectId: string,
): Contract {
  return {
    id: '__draft__',
    name: '__draft__',
    objectId,
    service,
    status: 'active',
    team: candidate.team.map((t, i) => ({
      id: `__draft_team_${i}`,
      role: t.role,
      employeeId: t.employeeId,
    })),
    stages: candidate.stages.map((s, i) => ({
      id: `__draft_stage_${i}`,
      stage: s.stage,
      startDate: s.start.toISOString(),
      days: s.days,
      order: i,
    })),
  }
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Re-exported to support consumers that need ROLES order without importing calc directly.
export { ROLES }
