export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
  }
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError('Не удалось связаться с сервером — проверьте подключение')
  }

  if (!res.ok) {
    let msg = `Ошибка сервера (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {}
    throw new ApiError(msg, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export function showError(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Неизвестная ошибка'
  alert(`Ошибка: ${msg}`)
}

export function confirmDuplicateName<T extends { name: string; id: string }>(
  items: T[],
  name: string,
  editId: string | null,
  entityLabel: string,
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return true
  const dup = items.find(it => it.id !== editId && it.name.trim().toLowerCase() === normalized)
  if (!dup) return true
  return confirm(`${entityLabel} с названием «${name.trim()}» уже существует. Создать дубликат?`)
}
