export type ObjectType = 'Жилой' | 'Коммерческий'
export type Complexity = 'Стандартный' | 'Средней сложности' | 'Сложный'
export type EmployeeRole = 'Тимлид' | 'Дизайнер' | 'Визуализатор' | 'Проектировщик' | 'Архитектор' | 'Комплектатор'
export type EmployeeType = 'Ведущий специалист' | 'Специалист' | 'Младший специалист'
export type ServiceType = 'ДПИ' | 'ЭАП' | 'АЛР' | 'Авторский надзор'
export type StageType = 'Этап 1' | 'Этап 2' | 'Этап 3' | 'Этап 4'
export type ContractStatus = 'active' | 'done'

export interface ProjectObject {
  id: string
  code?: string | null
  name: string
  type: ObjectType
  complexity: Complexity
  area: number
  roomsMain: number
  roomsAux: number
  roomsTech: number
  roomsIii: number
}

export interface Employee {
  id: string
  name: string
  role: EmployeeRole
  type: EmployeeType
  salary: number
}

export interface ContractTeam {
  id: string
  role: string
  employeeId: string
}

export interface ContractStage {
  id: string
  stage: string
  startDate: string | null
  days: number
  order: number
}

export interface Contract {
  id: string
  name: string
  objectId: string
  service: ServiceType
  status: ContractStatus
  team: ContractTeam[]
  stages: ContractStage[]
}

export interface Norm {
  id: string
  service: string
  stage: string
  artifact: string
  task: string
  role: string
  base: string
  hResidential: number
  hCommercial: number
  order: number
}

export interface AppSettings {
  hoursDay: number
  hoursMonth: number
  insurance: number
  kStandard: number
  kMedium: number
  kComplex: number
  kSenior: number
  kMid: number
  kJunior: number
  customHolidays: string[]
}

export interface MonthData {
  year: number
  month: number
  label: string
  key: string
}

export interface LoadResult {
  [employeeId: string]: {
    [monthKey: string]: number
  }
}
