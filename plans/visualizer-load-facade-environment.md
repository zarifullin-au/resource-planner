# План: Коэффициенты фасада и окружения для Визуализатора

## Контекст

Для роли «Визуализатор» нормо-часы зависят от двух параметров объекта, которых сейчас нет в модели:
- **Сложность разнообразия фасадов** (`facadeComplexity`): Легкий × 1 / Стандартный × 2 / Сложный × 4
- **Окружение** (`surroundings`): Загород ненаселённый × 1 / Загород населённый × 2 / Город × 4

Коэффициенты применяются только там, где роль = `Визуализатор` **и** `norm.base != 'Нет'` (т.е. у нормы есть база расчёта). Итоговый коэффициент в UI не отображается.

Связанный спек: `specs/visualizer-load-facade-environment.md`.

---

## Шаг 1 — Схема БД (`prisma/schema.prisma`, строки 35–49)

Добавить два поля в модель `Object`:

```prisma
facadeComplexity  String  @default("Легкий")          // "Легкий" | "Стандартный" | "Сложный"
surroundings      String  @default("Загород ненаселённый")  // "Город" | "Загород населённый" | "Загород ненаселённый"
```

После правки — создать миграцию:
```bash
npm run db:migrate
```

---

## Шаг 2 — TypeScript типы (`types/index.ts`, после строки 2)

Добавить новые union-типы и обновить интерфейс `ProjectObject`:

```typescript
export type FacadeComplexity = 'Легкий' | 'Стандартный' | 'Сложный'
export type Surroundings = 'Город' | 'Загород населённый' | 'Загород ненаселённый'
```

В `ProjectObject` (строка 22–33) добавить два поля:
```typescript
facadeComplexity: FacadeComplexity
surroundings: Surroundings
```

---

## Шаг 3 — Расчётная логика (`lib/calc.ts`)

**3а.** После строки 20 добавить канонические массивы:
```typescript
export const FACADE_COMPLEXITY_TYPES = ['Легкий', 'Стандартный', 'Сложный']
export const SURROUNDINGS_TYPES = ['Город', 'Загород населённый', 'Загород ненаселённый']
```

**3б.** После функции `getTypeK()` (строка 28–32) добавить два хелпера по образцу `getComplexityK`:
```typescript
export function getFacadeK(v: string): number {
  if (v === 'Стандартный') return 2
  if (v === 'Сложный') return 4
  return 1
}

export function getSurroundingsK(v: string): number {
  if (v === 'Город') return 4
  if (v === 'Загород населённый') return 2
  return 1
}
```

**3в.** В `calcStageHours()`, строка 109 — заменить формулу расчёта часов:
```typescript
// было:
const hours = baseVal * hPerUnit * kC * kT
// стало:
let hours = baseVal * hPerUnit * kC * kT
if (n.role === 'Визуализатор' && n.base !== 'Нет') {
  hours *= getFacadeK(object.facadeComplexity) * getSurroundingsK(object.surroundings)
}
```

---

## Шаг 4 — Slot Finder (`lib/slotFinder.ts`, строка 87)

В `getRoleHoursForStage()` аналогичное изменение (kT здесь = 1.0):
```typescript
// было:
const hours = baseVal * hPerUnit * kC * 1.0
// стало:
let hours = baseVal * hPerUnit * kC * 1.0
if (n.role === 'Визуализатор' && n.base !== 'Нет') {
  hours *= getFacadeK(object.facadeComplexity) * getSurroundingsK(object.surroundings)
}
```

Импортировать `getFacadeK` и `getSurroundingsK` из `@/lib/calc`.

---

## Шаг 5 — API POST (`app/api/objects/route.ts`, строки 20–32)

В `prisma.object.create({ data: { ... } })` добавить:
```typescript
facadeComplexity: body.facadeComplexity ?? 'Легкий',
surroundings: body.surroundings ?? 'Загород ненаселённый',
```

---

## Шаг 6 — API PUT (`app/api/objects/[id]/route.ts`, строки 19–32)

В `prisma.object.update({ data: { ... } })` добавить те же поля.

---

## Шаг 7 — UI форма объекта (`app/(app)/objects/page.tsx`)

**7а.** Добавить импорт новых массивов (строка 5):
```typescript
import { OBJECT_TYPES, COMPLEXITY_TYPES, FACADE_COMPLEXITY_TYPES, SURROUNDINGS_TYPES } from '@/lib/calc'
```

**7б.** Обновить `empty()` (строка 9–12):
```typescript
const empty = (): Partial<ProjectObject> => ({
  code: '', name: '', type: 'Жилой', complexity: 'Стандартный',
  facadeComplexity: 'Легкий', surroundings: 'Загород ненаселённый',
  area: 0, roomsMain: 0, roomsAux: 0, roomsTech: 0, roomsIii: 0,
})
```

**7в.** Добавить новую строку с двумя select'ами после блока «Вид / Сложность» (после строки 125), по той же сетке `grid-cols-2`:
```tsx
<div className="grid grid-cols-2 gap-3">
  <FormGroup label="Сложность фасадов">
    <select className="form-input" value={form.facadeComplexity || 'Легкий'} onChange={f('facadeComplexity')}>
      {FACADE_COMPLEXITY_TYPES.map(t => <option key={t}>{t}</option>)}
    </select>
  </FormGroup>
  <FormGroup label="Окружение">
    <select className="form-input" value={form.surroundings || 'Загород ненаселённый'} onChange={f('surroundings')}>
      {SURROUNDINGS_TYPES.map(t => <option key={t}>{t}</option>)}
    </select>
  </FormGroup>
</div>
```

---

## Порядок выполнения

1. `prisma/schema.prisma` → `npm run db:migrate`
2. `types/index.ts`
3. `lib/calc.ts` (массивы + хелперы + calcStageHours)
4. `lib/slotFinder.ts`
5. `app/api/objects/route.ts`
6. `app/api/objects/[id]/route.ts`
7. `app/(app)/objects/page.tsx`

---

## Проверка

1. `npm run dev` — убедиться что сборка без ошибок TypeScript
2. Создать/отредактировать объект — два новых поля отображаются и сохраняются
3. Проверить в нормах: у Визуализатора с базой ≠ «Нет» — часы умножаются на коэффициенты
4. Проверить старые объекты — без изменения дефолты (`Легкий` + `Загород ненаселённый`) = коэффициенты 1, расчёты не меняются
