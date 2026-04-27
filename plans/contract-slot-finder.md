# Plan: Contract Slot Finder (replace Block 2 of `/timeline`)

## Context

Сейчас на странице `/timeline` второй блок «ОКНО ДЛЯ НОВОГО ДОГОВОРА — СВОБОДНАЯ ЁМКОСТЬ» дублирует функционал страниц `/dashboard` и `/heatmap` — он лишь показывает свободные часы по ролям и сотрудникам. Пользователь не получает прямого ответа на вопрос «когда я могу взять новый договор и с какой командой?».

Цель — заменить этот блок интерактивным «подборщиком слота»:
- пользователь задаёт параметры будущего договора (услуга, объект, длительность этапов, желаемая дата),
- система находит **самую раннюю дату старта** и **конкретный состав команды** по 1 сотруднику на роль из норм,
- предлагает 2 альтернативы,
- показывает превью этапов в Блоке 1 и подмешивает их в расчёт нагрузки команды,
- даёт кнопку «Создать договор», которая ведёт на форму создания с предзаполненными значениями.

Ответы пользователя на Open Questions из спеки (учтены в плане):
- Один сотрудник на роль.
- Закрытые (`status: 'done'`) договора не учитывать (уже так в `calcLoad`).
- 2 альтернативы.
- Объект — преимущественно новый, ручной ввод параметров; список существующих как опция.
- Длительность этапов — дефолт 20 раб. дней (вынос в Settings — отдельная задача, не в этой).
- Бюджетного фильтра нет.
- Превью реально подмешивается в нагрузку (видно, как ляжет на календарь).

---

## Files

### Создать
- `lib/slotFinder.ts` — чистые функции алгоритма подбора слота (без UI).
- `components/timeline/ContractSlotFinder.tsx` — UI-блок с формой и результатом.

### Изменить
- `app/(app)/timeline/page.tsx` — удалить старый Block 2 (FilterButtons + сетка ролей/сотрудников + `FreeCell`), вставить `<ContractSlotFinder>`. Передать в него `contracts/objects/employees/norms/settings/months/load` и `synthDraft` из стейта, чтобы Block 1 мог отрисовать пунктирные превью-полосы и пересчитать `load` с учётом черновика.
- `app/(app)/contracts/page.tsx` — поддержать инициализацию формы из `sessionStorage`-ключа `contractDraft` (объект формы + опционально черновик объекта). Если ключ есть — открыть модал создания с предзаполненными полями и очистить ключ.

### Не трогать
- Старый `FreeCell`, импорт `FilterButtons` и связанная логика — удалить из `timeline/page.tsx`.
- Backend / API — не меняется.
- `prisma/schema.prisma`, `lib/calc.ts`, `lib/holidays.ts`, `lib/useAppData.ts` — без изменений.

---

## Reused Existing Code

| Что | Где |
|---|---|
| `calcStageHours(contract, stageIdx, object, employees, norms, settings)` | `lib/calc.ts:77-113` — даёт часы по ролям; передаём `team = []` чтобы `kT = 1.0` (`lib/calc.ts:107`) |
| `calcLoad(contracts, objects, employees, norms, settings, offset)` | `lib/calc.ts:115-175` — пересчёт нагрузки. Для превью передаём `[...contracts, syntheticContract]`. |
| `addWorkingDays`, `countWorkingDays`, `getMonths`, `buildHolidaySet` | `lib/calc.ts`, `lib/holidays.ts` |
| `STAGES`, `SERVICES`, `OBJECT_TYPES`, `COMPLEXITY_TYPES`, `ROLE_COLORS`, `ROLES` | `lib/calc.ts:13-18, 4-11` |
| `Modal`, `FormGroup`, `PageHeader` | `components/ui/index.tsx` |
| Стиль формы (`form-input`, `form-label`, `card`, `btn btn-primary` и т.д.) | `app/globals.css` (видны в `app/(app)/contracts/page.tsx:144-192`) |
| Паттерн модала создания договора | `app/(app)/contracts/page.tsx` (для понимания payload, который ждёт `POST /api/contracts`) |

---

## Step-by-Step Implementation

### 1. `lib/slotFinder.ts` — алгоритм

Экспортируется одна основная функция и вспомогательные типы:

```ts
export interface SlotInput {
  service: ServiceType
  object: ProjectObject              // временный объект (id может быть пустым)
  stageDays: number[]                // длина 4 — раб. дней на этап
  desiredStart: Date                 // не раньше сегодня
  contracts: Contract[]              // активные (status !== 'done')
  objects: ProjectObject[]
  employees: Employee[]
  norms: Norm[]
  settings: AppSettings
}

export interface SlotCandidate {
  startDate: Date
  endDate: Date
  stages: { stage: string; start: Date; end: Date; days: number }[]
  team: { role: string; employeeId: string; requiredH: number; freeH: number }[]
  bottleneck?: { role: string; shortageH: number }   // только если slot неполон
}

export interface SlotResult {
  primary: SlotCandidate | null
  alternatives: SlotCandidate[]      // до 2
  noSlotReason?: string              // если primary === null
}

export function findSlots(input: SlotInput): SlotResult
```

**Алгоритм `findSlots`**:

1. Построить «синтетический договор» из `input` с пустым `team`:
   ```ts
   const syntheticContract: Contract = {
     id: '__draft__', name: '__draft__',
     objectId: input.object.id || '__draft__',
     service: input.service, status: 'active',
     team: [], stages: [],
   }
   ```
2. Для каждой роли из `norms.filter(n => n.service === service)` посчитать `requiredHByStage[stageIdx][role]` через `calcStageHours(syntheticContract, stageIdx, object, employees, norms, settings)`. Так как `team = []`, `calcStageHours` пропустит все роли (см. `lib/calc.ts:96`). **Важно:** для подбора нам нужно временно положить в `team` всех сотрудников по ролям. Подход — собрать уникальный список ролей из `norms` и для каждой роли в `team` подставить `employeeId: ''` фиктивный, чтобы `calcStageHours` не пропустил роль. Тогда `kT = 1.0` (employees.find не найдёт).
   - Реализация: создать вспомогательный `getRequiredHoursPerRole(service, object, stageIdx, norms, settings)` без зависимости от `team`. Скопировать тело `calcStageHours` без проверки `teamEntry`. Это чище, чем мутировать synthetic team.
3. Цикл по кандидатным датам старта: `[desiredStart, desiredStart + 7d, +14d, ..., +180d]` (~26 итераций).
   Для каждой даты:
   - Построить расписание этапов: `stage[0].start = candidate`, `stage[0].end = addWorkingDays(start, days[0], holidays)`, `stage[i].start = addWorkingDays(stage[i-1].end, 1, holidays)` (следующий рабочий день).
   - Для каждого этапа и роли распределить `requiredH` по календарным месяцам пропорционально `countWorkingDays` (тот же приём, что в `calcLoad`, `lib/calc.ts:159-169`).
   - Получить `requiredHByEmpMonth[role][monthKey]` (на этом шаге `role`, не `empId` — мы ещё подбираем).
   - Запустить `calcLoad(input.contracts, ...)` единожды (вне цикла дат — он не зависит от candidate, только от существующих договоров; вынести подсчёт в начало).
   - Для каждой роли: перебрать `employees.filter(e => e.role === role)`. Кандидат подходит, если для каждого `monthKey` в окне договора:
     `(settings.hoursMonth - load[empId][monthKey]) - alreadyAssignedThisDraft[empId][monthKey] >= required[role][monthKey]`.
     Учитываем `alreadyAssignedThisDraft` чтобы не выбрать одного человека в две роли.
   - Сортировка кандидатов: сначала по типу (`Ведущий` → меньше часов нужно, kT=0.8), потом по большему запасу свободной ёмкости. Берём первого.
   - Если для какой-то роли ни одного кандидата — отметить как `bottleneck`, перейти к следующей дате.
4. Первая дата, где все роли закрыты — `primary`. Продолжить цикл, собирая `alternatives` (до 2): каждая следующая дата с укомплектованной командой, **отличной по составу или по дате**. Останавливаемся, когда нашли 2 альтернативы или закончили окно.
5. Если `primary === null` за 6 мес: вернуть `noSlotReason` + `bottleneck` от последней попытки (роль с наибольшим дефицитом).

**Юнит-тестируемость**: функция чистая, тесты можно написать позже. В этом плане тесты не входят.

### 2. `components/timeline/ContractSlotFinder.tsx` — UI

```tsx
interface Props {
  data: AppData                                    // useAppData() результат
  onDraftChange: (d: SlotDraftPreview | null) => void  // для Block 1 превью + load mix-in
}
```

**Внутренний state**:
- `service: ServiceType` (default 'ДПИ')
- `useExistingObject: boolean` (default false — в большинстве случаев новый объект)
- `objectId: string` (если useExistingObject)
- `objectDraft: { name, type, complexity, area, roomsMain, roomsAux, roomsTech, roomsIii }` — пустой объект при новом
- `stageDays: number[]` (длина = `STAGES.length`, дефолт 20)
- `desiredStart: string` (YYYY-MM-DD, дефолт сегодня)
- `result: SlotResult | null`
- `selectedCandidateIdx: 0 | 1 | 2` (primary / alt1 / alt2)

**Блок параметров** (грид 2 колонки):
- Левый столбец:
  - `<FormGroup label="Услуга">` → `<select className="form-input">` со SERVICES
  - `<FormGroup label="Объект">` → радио «Существующий» / «Новый» + либо `<select>` объектов, либо набор инпутов (тип/сложность/площадь/комнаты)
- Правый столбец:
  - 4 поля «Этап N (раб. дней)» с дефолтом 20
  - Дата `<input type="date">` для `desiredStart`
- Кнопка `Подобрать слот` (валидация: услуга есть И (объект выбран ИЛИ заполнено имя+тип+сложность); норм по этой услуге существует ≥ 1).

**Блок результата** (виден после первого Подбора):
- Если `result.primary === null`:
  - «В ближайшие 6 месяцев нет окна для этого договора»
  - Узкое место: роль и дефицит часов
  - Ссылка на `/heatmap` (без query — у `/heatmap` нет фильтра по роли через URL; просто ссылка).
- Иначе:
  - Табы: **Главное** | **Альт. 1** | **Альт. 2** (только присутствующие)
  - Карточка с датой старта/окончания, длительностью (∑ stage days, рабочих)
  - Список ролей и сотрудников с парой `freeH / requiredH`
  - Мини-сетка нагрузки по месяцам **выбранного** кандидата:
    `gridTemplateColumns: 200px repeat(months, 1fr)`, по строке на сотрудника — показать `% загрузки с учётом нового договора` (использует уже-пересчитанный `load` из `Block 1` через проп / sessionStorage).
  - Кнопка `Создать договор с этим составом` → подготовить payload, положить в `sessionStorage`, перейти `router.push('/contracts')`.

**Преобразование `selectedCandidateIdx` → `SlotDraftPreview`** для родителя:
```ts
interface SlotDraftPreview {
  contract: Contract       // synthetic, status: 'active', с реальными team/stages
  object: ProjectObject    // существующий или draft (id = '__draft__')
}
```
Эффект: `useEffect(() => onDraftChange(buildPreview(result, selectedCandidateIdx)), [...])`.

### 3. `app/(app)/timeline/page.tsx` — интеграция

- Поднять состояние `draft: SlotDraftPreview | null` на уровне страницы.
- Пересчитать `load`:
  ```ts
  const effectiveContracts = useMemo(
    () => draft ? [...contracts, draft.contract] : contracts,
    [contracts, draft]
  )
  const effectiveObjects = useMemo(
    () => draft && draft.object.id === '__draft__' ? [...objects, draft.object] : objects,
    [objects, draft]
  )
  const load = useMemo(
    () => calcLoad(effectiveContracts, effectiveObjects, employees, norms, settings, offset),
    [effectiveContracts, effectiveObjects, employees, norms, settings, offset]
  )
  ```
- `stageRows` (Block 1) дополнить барами из `draft.contract.stages` — отрисовать **пунктирной рамкой** + полупрозрачно (`opacity: 0.6`, `border: 2px dashed rgba(74,240,180,0.7)`).
- Удалить:
  - `empFilter` стейт, `roleFilterOptions`, `teamSummary` мемо
  - всю разметку Block 2 от `<div className="card">` до закрывающей `</div>` блока
  - функцию `FreeCell`
  - импорт `FilterButtons` из `@/components/ui`
- Вместо удалённой разметки — `<ContractSlotFinder data={appData} onDraftChange={setDraft} />`.

### 4. `app/(app)/contracts/page.tsx` — приём префилла

- В начале компонента — `useEffect(() => { ... }, [])`:
  ```ts
  const raw = sessionStorage.getItem('contractDraft')
  if (!raw) return
  sessionStorage.removeItem('contractDraft')
  const draft = JSON.parse(raw) as ContractDraftPayload
  // если draft.objectDraft заполнен — сначала POST /api/objects, получить objectId
  // открыть модал создания договора с заполненными полями и подставленным objectId
  ```
- Структура `ContractDraftPayload`:
  ```ts
  {
    name: string
    objectId: string | null         // если null → нужно создать через objectDraft
    objectDraft?: ProjectObjectInput
    service: ServiceType
    team: { role: string; employeeId: string }[]
    stages: { stage: string; startDate: string; days: number }[]
  }
  ```
- Если `objectDraft` задан — сначала `POST /api/objects` с этими полями, получить `id`, использовать вместо `objectId`. При ошибке — показать модал с пустым `objectId` и сообщение.

### 5. Превью загрузки в результате `ContractSlotFinder`

Внутри Result-карточки нужна сетка «как ляжет на календарь». Поскольку родитель уже пересчитал `load` с подмешанным draft, можно прокинуть его обратно через проп или прочитать из контекста.

Самое простое: `ContractSlotFinder` принимает дополнительно `effectiveLoad: LoadResult` и `months: MonthData[]`. Для каждой роли/сотрудника текущего кандидата отрисовать строку: имя · 6 ячеек месяцев · `% = load[empId][monthKey] / settings.hoursMonth × 100` (цвет по тем же порогам, что в `dashboard`).

---

## UI Layout

```
[PageHeader: Дашборд | PeriodNav]                               (без изменений)

[Block 1: Завершающиеся этапы]
  + дополнительно — пунктирные превью-бары для draft.contract.stages

[Block 2: НОВЫЙ — ПОДБОР СЛОТА ДЛЯ НОВОГО ДОГОВОРА]
  ┌─ Параметры договора ────────────────────────────────────┐
  │  [услуга ▾]              [этапы 1: 20 р.д.]              │
  │  ○ существующий объект   [этапы 2: 20 р.д.]              │
  │  ● новый                 [этапы 3: 20 р.д.]              │
  │  имя/тип/сложность       [этапы 4: 20 р.д.]              │
  │  площадь/комнаты         [желаемая дата ▾]               │
  │                          [✓ Подобрать слот]              │
  └─────────────────────────────────────────────────────────┘
  ┌─ Результат ──────────────────────────────────────────────┐
  │  [Главное] [Альт. 1] [Альт. 2]                            │
  │  Старт: 12.05  Окончание: 28.08  ·  78 раб. дн.           │
  │  Узкое место: Тимлид (10 ч запаса)                        │
  │                                                            │
  │  Команда:                                                  │
  │  Тимлид · Иванов И.И. · своб 80 ч / нужно 60 ч            │
  │  ...                                                       │
  │                                                            │
  │  Загрузка по месяцам (с учётом нового договора):          │
  │  Иванов И.И.  60% 80% 65% — — —                            │
  │  ...                                                       │
  │                                                            │
  │  [Создать договор с этим составом]                        │
  └─────────────────────────────────────────────────────────┘
```

---

## Verification

1. `npm run dev` → открыть `/timeline`. Старая сетка ролей/сотрудников и `FilterButtons` отсутствуют, на их месте — форма «Параметры договора».
2. Выбрать ДПИ + новый объект (Жилой, Стандартный, 100 м², 3 комн. основных) + дефолтные 20 р.д. → нажать «Подобрать слот».
3. Должен появиться кандидат `primary` с датой ≥ сегодня и командой по 1 сотруднику на каждую роль из норм ДПИ.
4. На Block 1 появились пунктирные бары для 4 этапов нового договора — позиции совпадают с датами в результате.
5. Свободная ёмкость в строках сотрудников `≥ 0` для каждого месяца окна (визуально проверить мини-грид загрузки).
6. Переключение Альт.1 / Альт.2 меняет состав или дату; превью на Block 1 и мини-грид — синхронно.
7. Убрать всех Тимлидов через Prisma Studio → «Подобрать слот» возвращает «нет окна» с узким местом «Тимлид».
8. Указать желаемую дату в прошлом → подбор начинается от сегодня (валидация молча клампит).
9. Кнопка «Создать договор с этим составом» → переходит на `/contracts`, открывается модал создания с заполненными `service`, `team` (selectы выставлены на подобранных сотрудников), `stages` (с датами и днями). Если объект новый — он сначала создан через POST `/api/objects`, его `id` подставлен в форму.
10. После создания договора и обновления страницы `/timeline` пунктирные превью-бары исчезают (sessionStorage очищен в `/contracts`), реальный договор отображается обычным баром.
11. `npx tsc --noEmit` не выдаёт новых ошибок (преcуществующие `Set<...>` ошибки в dashboard/heatmap игнорируем).

---

## Не входит в этот план

- Юнит-тесты `slotFinder.ts` (можно добавить отдельно).
- Перенос дефолтной длительности этапов в Settings (Open Question 5 — отдельная задача).
- Учёт стоимости команды (бюджет) в ранжировании.
- Поддержка более одного сотрудника на роль.
