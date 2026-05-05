# План: Динамические виды услуг и этапы в нормативах

## Контекст

Виды услуг (`SERVICES`) и этапы (`STAGES`) сейчас — захардкоженные массивы в `lib/calc.ts`. Пользователь хочет добавлять новые значения через UI страницы «Нормативы», чтобы нормы для них автоматически учитывались в расчётах. На сервере уже есть живые данные; обновление через `update.sh` использует `prisma db push` (без миграций) — добавление таблиц безопасно, данные не потеряются.

---

## Шаг 1 — Схема БД (`prisma/schema.prisma`)

Добавить две модели в конец файла:

```prisma
model Service {
  id    String @id @default(cuid())
  name  String @unique
  color String @default("#1A6BFF")
  order Int    @default(0)
}

model Stage {
  id    String @id @default(cuid())
  name  String @unique
  order Int    @default(0)
}
```

`prisma db push` создаст таблицы, не трогая существующие данные.

---

## Шаг 2 — Бутстрап дефолтных значений

**Создать `prisma/seed-defaults.ts`** — идемпотентный upsert 4 услуг и 4 этапов:

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const SERVICES = [
  { name: 'ДПИ', color: '#1A6BFF', order: 0 },
  { name: 'ЭАП', color: '#6366f1', order: 1 },
  { name: 'АЛР', color: '#f59e0b', order: 2 },
  { name: 'Авторский надзор', color: '#0ea5e9', order: 3 },
]
const STAGES = [
  { name: 'Этап 1', order: 0 }, { name: 'Этап 2', order: 1 },
  { name: 'Этап 3', order: 2 }, { name: 'Этап 4', order: 3 },
]
async function main() {
  for (const s of SERVICES) await prisma.service.upsert({ where: { name: s.name }, update: {}, create: s })
  for (const s of STAGES)   await prisma.stage.upsert(  { where: { name: s.name }, update: {}, create: s })
}
main().finally(() => prisma.$disconnect())
```

**`package.json`** — добавить скрипт:
```json
"db:bootstrap": "tsx prisma/seed-defaults.ts"
```

**`scripts/update.sh`** — после строки с `prisma db push` добавить:
```bash
docker-compose -f docker-compose.prod.yml exec app npm run db:bootstrap
```

**`prisma/seed.ts`** — вызвать в конце: добавить те же upsert-вызовы для новых установок через `npm run db:seed`.

---

## Шаг 3 — API маршруты (новые файлы)

Все следуют существующему паттерну: `export const dynamic = 'force-dynamic'`, без auth, 400/409 на ошибки.

| Файл | Методы | Описание |
|------|--------|----------|
| `app/api/services/route.ts` | GET, POST | GET: `findMany` по `order asc`; POST: создать с `name`+`color`, auto-increment order |
| `app/api/services/reorder/route.ts` | PUT | Принять `{ ids: string[] }`, обновить `order` через `prisma.$transaction` |
| `app/api/stages/route.ts` | GET, POST | Аналогично services, без `color` |
| `app/api/stages/reorder/route.ts` | PUT | Аналогично services/reorder |

POST возвращает 409 при дублировании имени (поймать `P2002` от Prisma).

---

## Шаг 4 — Типы (`types/index.ts`)

- `ServiceType` — расширить с union-литерала до `string` (иначе TS сломается при новых услугах)
- `StageType` — аналогично расширить до `string`
- Добавить интерфейсы:
```ts
export interface ServiceRecord { id: string; name: string; color: string; order: number }
export interface StageRecord   { id: string; name: string; order: number }
```

---

## Шаг 5 — `lib/useAppData.ts`

Добавить 2 запроса к существующим 5 параллельным:
```ts
fetchJson<ServiceRecord[]>('/api/services'),
fetchJson<StageRecord[]>('/api/stages'),
```

Добавить в `AppData` интерфейс: `services: ServiceRecord[]`, `stages: StageRecord[]`.
В случае ошибки — дефолт `[]`.

---

## Шаг 6 — `lib/calc.ts` — рефактор `calcStageHours`

**Критическое изменение**: строка 85 `const stage = STAGES[stageIdx]` — fragile, зависит от порядка.

Изменить сигнатуру:
```ts
// было:
export function calcStageHours(contract, stageIdx: number, ...)
// стало:
export function calcStageHours(contract, stageName: string, ...)
```

В `calcLoad` (строка 149) изменить вызов:
```ts
// было:
const stageHours = calcStageHours(contract, si, ...)
// стало:
const stageHours = calcStageHours(contract, stageInfo.stage, ...)
```

`STAGES` и `SERVICES` — переименовать в `DEFAULT_STAGES` / `DEFAULT_SERVICES` для `seed-defaults.ts`. Удалить старые экспорты **только на финальном шаге** (Шаг 10).

---

## Шаг 7 — `lib/slotFinder.ts`

Добавить `stages: string[]` в интерфейс `SlotInput`.

- `buildScheduleStages`: `STAGES.length` / `STAGES[i]` → `input.stages.length` / `input.stages[i]`
- `findSlots`: `STAGES.map(...)` → `input.stages.map(...)`

---

## Шаг 8 — Обновление потребителей

### `app/(app)/contracts/page.tsx`
- Получить `services`, `stages` из `useAppData()`
- Dropdown услуги: `services.map(s => <option key={s.id}>{s.name}</option>)`
- Инициализация стадий (L15, L51, L93): `stages.map(s => ({ stage: s.name, startDate: today, days: 20 }))`
- Цикл строк стадий (L179): `stages.map(...)` вместо `STAGES.map(...)`
- Вызов `calcStageHours` (L255): передать `contract.stages[hoursId.stageIdx]?.stage ?? ''`
- Заголовок модала часов (L258): то же самое вместо `STAGES[hoursId.stageIdx]`

### `app/(app)/heatmap/page.tsx`
- Убрать импорт `STAGES`
- Строка 376: `stageInfo.stage` уже есть на объекте — использовать напрямую

### `components/timeline/ContractSlotFinder.tsx`
- Получить `services`, `stages` из `useAppData()`
- Dropdown услуги и цикл входов стадий: из динамических данных
- `stageDays` инициализировать через `useEffect([stages])` (stages пустой при первом рендере)
- Передать в `findSlots`: `stages: stages.map(s => s.name)`

---

## Шаг 9 — UI страницы нормативов (`app/(app)/norms/page.tsx`)

### Замены
- `SERVICE_COLORS` (захардкоженный dict, строки 9-11) → `useMemo(() => Object.fromEntries(services.map(s => [s.name, s.color])), [services])`
- `svcOptions` / `stageOptions`: строить из `services` / `stages`
- Дропдауны в модале добавления нормы: из динамических данных

### Новые кнопки в `PageHeader`
```tsx
<button className="btn btn-sm" onClick={() => setShowAddService(true)}>+ Вид услуги</button>
<button className="btn btn-sm" onClick={() => setShowAddStage(true)}>+ Этап</button>
```

### Модал «+ Вид услуги»
- Поле `name`
- 8 цветовых свотчей: `['#1A6BFF','#6366f1','#f59e0b','#0ea5e9','#10b981','#ef4444','#8b5cf6','#ec4899']`
- Свотч = `<button>` `w-7 h-7 rounded-full`; выбранный — `ring-2 ring-offset-1`
- При сохранении: `POST /api/services`, затем `refresh()`

### Модал «+ Этап» (с drag-to-reorder)
- Локальная копия `dragStages`, инициализируется через `useEffect` при открытии
- HTML5 drag API (без библиотек): `draggable`, `onDragStart`, `onDragOver`, `onDrop`
- На drop: оптимистично перестроить локальный массив
- Ниже — поле ввода нового этапа
- При сохранении: `PUT /api/stages/reorder` (если порядок изменился) → `POST /api/stages` (если новое имя) → `refresh()`

---

## Шаг 10 — Финальная чистка

```bash
grep -r "import.*\bSTAGES\b\|import.*\bSERVICES\b" app/ components/ lib/ --include="*.ts" --include="*.tsx"
```
Если вывод пустой — убрать экспорты `STAGES`/`SERVICES` из `calc.ts`.

---

## Порядок внесения изменений

```
1. schema.prisma            — новые таблицы
2. seed-defaults.ts         — новый файл
3. package.json + update.sh — bootstrap
4. API routes               — новые файлы
5. types/index.ts           — расширить типы
6. calc.ts                  — calcStageHours(stageName) + DEFAULT_*
7. slotFinder.ts            — stages в SlotInput
8. useAppData.ts            — +services/stages
9. contracts/page.tsx       — обновить
10. heatmap/page.tsx        — обновить
11. ContractSlotFinder.tsx  — обновить
12. norms/page.tsx          — динамика + кнопки + модалы
13. grep + удалить STAGES/SERVICES
```

---

## Ключевые файлы

| Файл | Действие |
|------|----------|
| `prisma/schema.prisma` | +2 модели |
| `prisma/seed-defaults.ts` | новый |
| `scripts/update.sh` | +1 строка после db push |
| `package.json` | +1 скрипт db:bootstrap |
| `app/api/services/route.ts` | новый |
| `app/api/services/reorder/route.ts` | новый |
| `app/api/stages/route.ts` | новый |
| `app/api/stages/reorder/route.ts` | новый |
| `types/index.ts` | ServiceType→string, StageType→string, +ServiceRecord, +StageRecord |
| `lib/useAppData.ts` | +2 запроса, +2 поля |
| `lib/calc.ts` | calcStageHours(stageIdx→stageName), DEFAULT_* константы |
| `lib/slotFinder.ts` | SlotInput.stages: string[] |
| `app/(app)/norms/page.tsx` | динамика + 2 кнопки + 2 модала |
| `app/(app)/contracts/page.tsx` | динамика, fix calcStageHours call |
| `app/(app)/heatmap/page.tsx` | убрать STAGES[si] |
| `components/timeline/ContractSlotFinder.tsx` | динамика + stages в SlotInput |

---

## Проверка

1. `npm run db:bootstrap` дважды — второй раз без ошибок (идемпотентность)
2. `GET /api/services` → 4 записи, `GET /api/stages` → 4 записи
3. Страница «Нормативы» — фильтры и дропдауны работают как раньше
4. Добавить новый вид услуги → появляется в фильтре и дропдауне без перезагрузки
5. Добавить новый этап → аналогично
6. Перетащить этапы, сохранить → порядок сохраняется после перезагрузки
7. Страница «Договоры» — дропдаун услуги и стадии корректны
8. «Таймлайн» / «Нагрузка» — расчёты не изменились для существующих данных
9. Норма для новой услуги → часы попадают в расчёт нагрузки

---

## Риски

- **`stageDays` в ContractSlotFinder** инициализируется до загрузки `stages` → нужен `useEffect([stages])` для синхронизации длины массива
- **`Contract.service: ServiceType`** — расширение до `string` снимает TS-ошибки при новых услугах
- **`prisma db push` на сервере** — только добавляет таблицы; `db:bootstrap` идемпотентен — лишний запуск безопасен
