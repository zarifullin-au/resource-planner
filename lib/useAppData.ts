'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchJson, showError } from '@/lib/api'
import type { ProjectObject, Employee, Contract, Norm, AppSettings } from '@/types'

export interface AppData {
  objects: ProjectObject[]
  employees: Employee[]
  contracts: Contract[]
  norms: Norm[]
  settings: AppSettings
  loading: boolean
  error: string | null
  refresh: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  hoursDay: 7, hoursMonth: 160, insurance: 0.2,
  kStandard: 1.0, kMedium: 1.25, kComplex: 1.5,
  kSenior: 0.8, kMid: 1.0, kJunior: 1.2,
}

export function useAppData(): AppData {
  const [objects, setObjects] = useState<ProjectObject[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [norms, setNorms] = useState<Norm[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.allSettled([
      fetchJson<ProjectObject[]>('/api/objects'),
      fetchJson<Employee[]>('/api/employees'),
      fetchJson<Contract[]>('/api/contracts'),
      fetchJson<Norm[]>('/api/norms'),
      fetchJson<Partial<AppSettings>>('/api/settings'),
    ]).then(results => {
      if (cancelled) return

      const [objsR, empsR, consR, normsR, settR] = results
      if (objsR.status === 'fulfilled') setObjects(objsR.value)
      if (empsR.status === 'fulfilled') setEmployees(empsR.value)
      if (consR.status === 'fulfilled') setContracts(consR.value)
      if (normsR.status === 'fulfilled') setNorms(normsR.value)
      if (settR.status === 'fulfilled') setSettings({ ...DEFAULT_SETTINGS, ...settR.value })

      const failed = results
        .map((r, i) => r.status === 'rejected'
          ? `${['объекты', 'сотрудники', 'договоры', 'нормативы', 'настройки'][i]}: ${(r.reason as Error).message}`
          : null)
        .filter(Boolean)

      if (failed.length > 0) {
        const msg = `Не удалось загрузить: ${failed.join('; ')}`
        setError(msg)
        showError(new Error(msg))
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [tick])

  return { objects, employees, contracts, norms, settings, loading, error, refresh }
}
