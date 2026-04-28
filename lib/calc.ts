import type { AppSettings, Contract, Employee, MonthData, Norm, LoadResult, ProjectObject } from '@/types'
import { buildHolidaySet, toIsoDate } from '@/lib/holidays'

export const ROLE_COLORS: Record<string, string> = {
  'Тимлид': '#1A6BFF',
  'Дизайнер': '#6366f1',
  'Визуализатор': '#f59e0b',
  'Проектировщик': '#0ea5e9',
  'Архитектор': '#ec4899',
  'Комплектатор': '#94a3b8',
}

export const ROLES = ['Тимлид', 'Дизайнер', 'Визуализатор', 'Проектировщик', 'Архитектор', 'Комплектатор']
export const STAGES = ['Этап 1', 'Этап 2', 'Этап 3', 'Этап 4']
export const SERVICES = ['ДПИ', 'ЭАП', 'АЛР', 'Авторский надзор']
export const OBJECT_TYPES = ['Жилой', 'Коммерческий']
export const COMPLEXITY_TYPES = ['Стандартный', 'Средней сложности', 'Сложный']
export const EMPLOYEE_TYPES = ['Ведущий специалист', 'Специалист', 'Младший специалист']
export const BASES = ['Нет', 'Площадь объекта', 'Кол-во комнат основные', 'Кол-во комнат вспомагательные', 'Кол-во комнат технические', 'Кол-во позиций ИИИ']

export function getComplexityK(complexity: string, settings: AppSettings): number {
  if (complexity === 'Средней сложности') return settings.kMedium
  if (complexity === 'Сложный') return settings.kComplex
  return settings.kStandard
}

export function getTypeK(type: string, settings: AppSettings): number {
  if (type === 'Ведущий специалист') return settings.kSenior
  if (type === 'Младший специалист') return settings.kJunior
  return settings.kMid
}

function isWorkingDay(d: Date, holidays?: Set<string>): boolean {
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return false
  if (holidays && holidays.has(toIsoDate(d))) return false
  return true
}

export function addWorkingDays(date: Date, days: number, holidays?: Set<string>): Date {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (isWorkingDay(d, holidays)) added++
  }
  return d
}

export function countWorkingDays(start: Date, end: Date, holidays?: Set<string>): number {
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    if (isWorkingDay(d, holidays)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function getMonths(n = 12, offset = 0): MonthData[] {
  const months: MonthData[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i + offset, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    months.push({
      year,
      month,
      label: d.toLocaleDateString('ru', { month: 'short', year: '2-digit' }),
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
    })
  }
  return months
}

export function calcStageHours(
  contract: Contract,
  stageIdx: number,
  object: ProjectObject,
  employees: Employee[],
  norms: Norm[],
  settings: AppSettings
): Record<string, number> {
  const stage = STAGES[stageIdx]
  const service = contract.service
  const isResidential = object.type === 'Жилой'
  const kC = getComplexityK(object.complexity, settings)
  const result: Record<string, number> = {}

  const stageNorms = norms.filter(n => n.service === service && n.stage === stage)

  for (const n of stageNorms) {
    const role = n.role
    const teamEntry = contract.team.find(t => t.role === role)
    if (!teamEntry) continue

    let baseVal = 1
    if (n.base === 'Площадь объекта') baseVal = object.area || 0
    else if (n.base === 'Кол-во комнат основные') baseVal = object.roomsMain || 0
    else if (n.base === 'Кол-во комнат вспомагательные') baseVal = object.roomsAux || 0
    else if (n.base === 'Кол-во комнат технические') baseVal = object.roomsTech || 0
    else if (n.base === 'Кол-во позиций ИИИ') baseVal = object.roomsIii || 0

    const hPerUnit = isResidential ? n.hResidential : n.hCommercial
    const emp = employees.find(e => e.id === teamEntry.employeeId)
    const kT = emp ? getTypeK(emp.type, settings) : 1.0
    const hours = baseVal * hPerUnit * kC * kT
    result[role] = (result[role] || 0) + hours
  }

  return result
}

export function calcLoad(
  contracts: Contract[],
  objects: ProjectObject[],
  employees: Employee[],
  norms: Norm[],
  settings: AppSettings,
  offset = 0
): LoadResult {
  // Window: 2 months before the displayed period through 16 months after,
  // so dashboard (6 mo) and heatmap (12 mo) views always have data even when
  // the user navigates far forward or back.
  const months = getMonths(18, offset - 2)
  const result: LoadResult = {}

  const fromYear = months[0].year - 1
  const toYear = months[months.length - 1].year + 1
  const holidays = buildHolidaySet(fromYear, toYear, settings.customHolidays ?? [])

  for (const emp of employees) {
    result[emp.id] = {}
    for (const m of months) {
      result[emp.id][m.key] = 0
    }
  }

  for (const contract of contracts) {
    if (contract.status === 'done') continue
    const object = objects.find(o => o.id === contract.objectId)
    if (!object) continue

    for (let si = 0; si < (contract.stages || []).length; si++) {
      const stageInfo = contract.stages[si]
      if (!stageInfo?.startDate) continue

      const stageHours = calcStageHours(contract, si, object, employees, norms, settings)
      const start = new Date(stageInfo.startDate)
      const end = addWorkingDays(start, stageInfo.days || 20, holidays)

      for (const [role, hours] of Object.entries(stageHours)) {
        const teamEntry = contract.team.find(t => t.role === role)
        if (!teamEntry) continue
        const empId = teamEntry.employeeId
        if (!result[empId]) result[empId] = {}

        for (const m of months) {
          const mStart = new Date(m.year, m.month, 1)
          const mEnd = new Date(m.year, m.month + 1, 0)
          const overlapStart = start > mStart ? start : mStart
          const overlapEnd = end < mEnd ? end : mEnd
          if (overlapStart > overlapEnd) continue
          const overlapWD = countWorkingDays(overlapStart, overlapEnd, holidays)
          const totalWD = countWorkingDays(start, end, holidays) || 1
          const fraction = overlapWD / totalWD
          result[empId][m.key] = (result[empId][m.key] || 0) + hours * fraction
        }
      }
    }
  }

  return result
}

export function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '136,145,168'
}
