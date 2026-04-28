# Resource Planner

Система планирования нагрузки сотрудников. Next.js 14 + PostgreSQL + Prisma + NextAuth.

## Установка

### Вариант 1: Установочный скрипт (рекомендуется)

```bash
curl -sSL https://raw.githubusercontent.com/zarifullin-au/resource-planner/main/scripts/install.sh | bash
```

### Вариант 2: Manual установка

**Требования:**
- Node.js 18+
- PostgreSQL (локально или облако: Supabase, Neon, Railway)

```bash
git clone https://github.com/zarifullin-au/resource-planner.git
cd resource-planner
npm install
cp .env.example .env
```

Отредактируйте `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/resource_planner"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

```bash
npm run db:migrate    # Создать схему БД
npm run db:seed       # Заполнить демо-данными
npm run dev           # Запустить dev сервер
```

### Вариант 3: Docker (с PostgreSQL)

```bash
docker-compose up -d
```

Откроется [http://localhost:3000](http://localhost:3000)

---

**Логин по умолчанию:**
- Email: `admin@example.com`
- Пароль: `admin123`

---

## Структура проекта

```
resource-planner/
├── app/
│   ├── api/                   # REST API (Next.js Route Handlers)
│   │   ├── auth/[...nextauth] # NextAuth
│   │   ├── objects/           # CRUD объектов
│   │   ├── contracts/         # CRUD договоров
│   │   ├── employees/         # CRUD сотрудников
│   │   ├── norms/             # CRUD нормативов
│   │   └── settings/          # Настройки
│   ├── (app)/                 # Защищённые страницы приложения
│   │   ├── dashboard/         # Загрузка сотрудников
│   │   ├── heatmap/           # Тепловая карта
│   │   ├── objects/           # Объекты
│   │   ├── contracts/         # Договоры
│   │   ├── employees/         # Сотрудники
│   │   ├── norms/             # Нормативы
│   │   └── settings/          # Настройки
│   └── login/                 # Страница входа
├── components/
│   ├── layout/                # Sidebar, Topbar
│   └── ui/                    # Modal, Confirm, PeriodNav, FilterButtons...
├── lib/
│   ├── calc.ts                # Вся логика расчёта нагрузки
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # NextAuth config
│   └── useAppData.ts          # React hook для загрузки данных
├── prisma/
│   ├── schema.prisma          # Схема БД
│   └── seed.ts                # Начальные данные
└── types/
    └── index.ts               # TypeScript типы
```

## Добавление пользователей

Пока нет UI управления пользователями. Добавьте через Prisma Studio:

```bash
npm run db:studio
```

Или через скрипт:
```typescript
import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('пароль', 10)
await prisma.user.create({ data: { name: 'Имя', email: 'email@example.com', password: hash } })
```

## Развертывание

### Локально в Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### На Vercel (фронтенд) + PostgreSQL облако

1. Форкните репозиторий на GitHub
2. Подключите к Vercel: https://vercel.com/import
3. Добавьте переменные окружения в Vercel Dashboard:
   - `DATABASE_URL` → Neon/Supabase
   - `NEXTAUTH_SECRET` → `openssl rand -base64 32`
   - `NEXTAUTH_URL` → ваш домен (например, `https://app.yoursite.com`)

```bash
npm run build
npm start
```
