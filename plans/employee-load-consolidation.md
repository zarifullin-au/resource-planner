# Plan: Employee Load Page Consolidation

## Context
Страница `/dashboard` дублирует `/heatmap`: обе показывают нагрузку сотрудников. Задача — удалить `/dashboard`, перенести блок «Нагрузка по ролям» на `/heatmap`, расширить тепловую карту всплывающим попапом с детализацией по задачам, и переименовать раздел в «Нагрузка сотрудников».

---

## Шаг 1 — Удалить `/dashboard`

**Файлы:**
- Удалить `app/(app)/dashboard/page.tsx`
- `components/layout/Sidebar.tsx` — убрать строку `{ href: '/dashboard', icon: '⬡', label: 'Загрузка сотрудников' }`
- `middleware.ts` — убрать `'/dashboard/:path*'` из `matcher`

---

## Шаг 2 — Переименовать `/heatmap`

**Файл:** `components/layout/Sidebar.tsx`
- `label: 'Тепловая карта'` → `label: 'Нагрузка сотрудников'`

**Файл:** `app/(app)/heatmap/page.tsx`
- Заголовок `'Тепловая карта нагрузки'` → `'Нагрузка сотрудников'`
- Подзаголовок `'Нагрузка сотрудников по месяцам в часах'` → `'Загрузка по ролям и по сотрудникам'`

---

## Шаг 3 — Добавить блок «Нагрузка по ролям» на `/heatmap`

**Файл:** `app/(app)/heatmap/page.tsx`

Блок берётся целиком из `dashboard/page.tsx` (раздел «Role load block»), с единственным изменением: горизонт уже **12 месяцев** (совпадает с существующим `months = getMonths(12, offset)`).

Размещение: **над** существующей тепловой картой (`.card`), внутри общего `<div>`.

Новый импорт: добавить `ROLES` в импорт из `@/lib/calc` (уже импортирован `ROLE_COLORS`).

Никакого отдельного `offset` не нужно — блок использует тот же `offset` и `months`, что и тепловая карта. Один `PeriodNav` управляет обоими.

Заголовок блока: `НАГРУЗКА ПО РОЛЯМ — 12 МЕСЯЦЕВ`.

Фильтр ролей `FilterButtons` остаётся только над тепловой картой (нижний блок), верхний блок показывает все роли всегда.

---

## Шаг 4 — Попап по клику на ячейку тепловой карты

**Файл:** `app/(app)/heatmap/page.tsx`

### 4.1 Состояние
```ts
const [selected, setSelected] = useState<{ emp: Employee; month: MonthData } | null>(null)
const [popupPage, setPopupPage] = useState(0)
const PAGE_SIZE = 5
```

### 4.2 Вычисление данных попапа
Вычисляется через `useMemo` от `selected`:

```
для каждого активного contract, где contract.team.some(t => t.employeeId === emp.id):
  найти object по contract.objectId
  для каждого stage в contract.stages (с startDate):
    вычислить start/end через addWorkingDays(start, stage.days, holidays)
    проверить overlap с [mStart, mEnd] месяца
    если overlap > 0:
      fraction = overlapWD / totalWD
      для каждой нормы (service+stage+role совпадает, роль сотрудника в команде):
        вычислить hours = baseVal * hPerUnit * kC * kT * fraction
        если hours > 0 → добавить в результат
```

Нужен импорт `buildHolidaySet` из `@/lib/holidays` и `addWorkingDays`, `countWorkingDays`, `STAGES`, `getComplexityK`, `getTypeK` из `@/lib/calc`.

`holidays` вычисляется один раз через `useMemo` по `months` и `settings.customHolidays` (аналогично `timeline/page.tsx`).

### 4.3 Структура результата
```ts
interface NormLine {
  artifact: string
  task: string
  role: string
  hours: number
}
interface StageDetail {
  stageName: string
  totalHours: number
  norms: NormLine[]
}
interface ContractDetail {
  contractName: string
  service: string
  objectName: string
  stages: StageDetail[]
  totalHours: number
}
```

### 4.4 Попап UI
Использует `Modal` из `components/ui/index.tsx` (без `onSave`, только «Закрыть»).

- Заголовок: `{emp.name} — {month.label}`
- Итого: `X ч из Y ч (Z%)`
- Список `ContractDetail[]` — сгруппирован: Объект → Договор → Этап → Задачи
- Пагинация: если `contractDetails.length > PAGE_SIZE`, показывать кнопки «‹ Пред» / «След ›» и `страница X из Y` в футере модала (перед кнопкой «Закрыть»)
- Если данных нет: «Нет задач в этом месяце»

### 4.5 Ячейка таблицы
- `cursor-default` → `cursor-pointer`
- `onClick={() => { setSelected({ emp, month: m }); setPopupPage(0) }}`
- `title` tooltip — оставить

---

## Файлы, которые меняются

| Файл | Действие |
|---|---|
| `app/(app)/dashboard/page.tsx` | **удалить** |
| `middleware.ts` | убрать `/dashboard/:path*` |
| `components/layout/Sidebar.tsx` | убрать `/dashboard`, переименовать `/heatmap` |
| `app/(app)/heatmap/page.tsx` | основной рефактор |

## Файлы, которые НЕ меняются
- `lib/calc.ts` — все нужные функции уже экспортированы
- `components/ui/index.tsx` — Modal уже подходит
- `types/index.ts` — типы достаточны

---

## Проверка после реализации

1. `npm run dev` — сервер стартует без ошибок
2. `/dashboard` → 404 или редирект (маршрут не защищён, значит уйдёт на login — нормально)
3. Сайдбар: нет «Загрузка сотрудников», есть «Нагрузка сотрудников»
4. `/heatmap`: вверху блок с барами по ролям за 12 месяцев
5. PeriodNav переключает оба блока синхронно
6. Клик на ячейку → открывается модал с детализацией
7. Если у сотрудника > 5 договоров в месяце — пагинация работает
8. Клик вне модала → закрывается
