# Plan: Timeline Dashboard Page (`/timeline`)

## Context

Добавляем новую страницу «Дашборд» в раздел «Обзор» (маршрут `/timeline`). Страница отвечает на два вопроса:
1. Какие этапы договоров завершаются в ближайшие 6 месяцев (Gantt-таймлайн).
2. Когда у команды есть свободная ёмкость для нового договора (сетка свободных часов по сотрудникам).

Попутно добавляем поддержку российских праздников и пользовательских выходных в расчёты рабочих дней (как запросил пользователь в Open Questions спеки).

---

## Files

### Создать
- `lib/holidays.ts` — константы РФ-праздников + `buildHolidaySet()`
- `app/(app)/timeline/page.tsx` — новая страница (два блока)

### Изменить
- `prisma/schema.prisma` — поле `customHolidays String @default("[]")` в `Settings`
- `types/index.ts` — `customHolidays: string[]` в `AppSettings`
- `lib/calc.ts` — обновить `addWorkingDays`, `countWorkingDays`, `calcLoad`
- `lib/useAppData.ts` — парсинг `customHolidays` из API + default `[]`
- `app/api/settings/route.ts` — сериализация/десериализация `customHolidays`
- `app/(app)/settings/page.tsx` — новая секция «ПРАЗДНИЧНЫЕ ДНИ»
- `components/layout/Sidebar.tsx` — добавить пункт «Дашборд» (`/timeline`)

---

## Step-by-Step Implementation

### 1. Schema migration
Добавить в `Settings`:
```prisma
customHolidays  String  @default("[]")
```
Команды:
```bash
npx prisma migrate dev --name add_custom_holidays
npx prisma generate
```

### 2. `types/index.ts`
Добавить в `AppSettings`:
```ts
customHolidays: string[]   // ["YYYY-MM-DD", ...]
```

### 3. `lib/holidays.ts` (новый файл)
Экспорты:
- `RU_HOLIDAY_MONTH_DAYS: readonly string[]` — 15 дат в формате `"MM-DD"`:
  `01-01..01-08, 02-23, 03-08, 05-01, 05-09, 06-12, 11-04, 12-31`
- `buildHolidaySet(fromYear, toYear, customHolidays): Set<string>` — разворачивает по годам + добавляет custom

### 4. `lib/calc.ts`
- `addWorkingDays(date, days, holidays?: Set<string>)` — день пропускается если сб/вс **или** `holidays.has("YYYY-MM-DD")`
- `countWorkingDays(start, end, holidays?: Set<string>)` — аналогично
- `calcLoad(...)` — строит `holidays` через `buildHolidaySet` в начале функции, передаёт во все вызовы выше

### 5. `lib/useAppData.ts`
- В `DEFAULT_SETTINGS` добавить `customHolidays: []`
- После fetch settings: `customHolidays: JSON.parse(raw.customHolidays ?? '[]')`

### 6. `app/api/settings/route.ts`
- **GET**: `return { ...settings, customHolidays: JSON.parse(settings.customHolidays) }`
- **PUT**: `customHolidays: JSON.stringify(Array.isArray(body.customHolidays) ? body.customHolidays : [])`

### 7. `app/(app)/settings/page.tsx`
Новая карточка «ПРАЗДНИЧНЫЕ ДНИ»:
- Выбор года (number input)
- Read-only теги РФ-праздников за этот год (информативно)
- Список пользовательских праздников с кнопкой удаления
- Date input + кнопка «Добавить» для новых дат
- Изменения включаются в `form.customHolidays`, попадают в PUT при сохранении

### 8. `components/layout/Sidebar.tsx`
Добавить первым пунктом в секцию «Обзор»:
```ts
{ href: '/timeline', icon: '⊟', label: 'Дашборд' }
```

### 9. `app/(app)/timeline/page.tsx`
**State**: `offset` (shared), `selectedStage` (для модала).

**Block 1 — Завершающиеся этапы (Gantt)**:
- `windowStart` = 1-е число `months[0]`, `windowEnd` = последний день `months[5]`
- Фильтр: только этапы где `endDate` попадает в окно (начало может быть до окна)
- Позиционирование бара:
  - `leftPct = (max(startDate, windowStart) − windowStart) / windowMs × 100`
  - `widthPct = (endDate − max(startDate, windowStart)) / windowMs × 100`
  - Минимальная ширина 0.5% чтобы короткие этапы были видны
- Левый клип (начало до окна): `border-radius` слева = 0, визуальный маркер
- Цвет срочности (от сегодня, независимо от offset):
  - 0 мес → `var(--accent4)` (красный)
  - 1 мес → `#f59a4a` (оранжевый)
  - 2–3 мес → `var(--accent3)` (жёлтый)
  - 4+ мес → `var(--text3)` (нейтральный)
- Клик по бару → `selectedStage` → `<Modal>` (read-only): название договора, объект, услуга, этап, даты, длительность, команда
- Tooltip через `title` attribute

**Block 2 — Свободная ёмкость**:
- Данные из `calcLoad()` (уже посчитан): `freeH = max(0, hoursMonth − load[empId][key])`
- Строки: «Команда» (min freePct по ролям), потом роли с вложенными сотрудниками
- Цвет: ≥ 50% → зелёный, 20–49% → жёлтый, < 20% → красный
- `FilterButtons` по роли (аналог dashboard)
- Сетка `130px + repeat(6, 1fr)`, высота ячеек 52px — идентично dashboard

---

## Reused Existing Code
- `getMonths()`, `calcLoad()`, `addWorkingDays()` — `lib/calc.ts`
- `ROLE_COLORS`, `ROLES` — `lib/calc.ts`
- `useAppData()` — `lib/useAppData.ts`
- `Modal`, `PeriodNav`, `FilterButtons`, `PageHeader` — `components/ui/index.tsx`
- CSS переменные и класс `.card` — `app/globals.css`
- Паттерн страницы — аналог `app/(app)/dashboard/page.tsx`

---

## Verification

1. `npx prisma studio` → Settings → поле `customHolidays = '[]'` существует
2. GET `/api/settings` → `customHolidays` возвращается как массив `[]`
3. PUT с `customHolidays: ["2025-01-09"]` → сохраняется, возвращается при GET
4. Сайдбар: пункт «Дашборд» появился в «Обзор», маршрут `/timeline` открывается
5. Block 1: этап с endDate в текущем месяце → красный бар; в следующем → оранжевый
6. Block 1: клик по бару → модал с деталями; кнопки сохранения нет
7. Block 1: этап начатый до окна → бар начинается от левого края с плоским левым краем
8. Block 2: свободные часы сотрудника = `hoursMonth − load[empId][key]` (проверить с dashboard)
9. PeriodNav: сдвиг периода синхронно меняет оба блока
10. Settings: добавить/удалить кастомный праздник → сохраняется, влияет на расчёт
