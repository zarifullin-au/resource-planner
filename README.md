# Resource Planner

Система планирования нагрузки сотрудников. Next.js 14 + PostgreSQL + Prisma + NextAuth.

## Быстрый старт

### 1. Требования
- Node.js 18+
- PostgreSQL (локально или облако: Supabase, Neon, Railway)

### 2. Установка

```bash
# Клонируйте или скопируйте папку проекта, затем:
cd resource-planner
npm install
```

### 3. Настройка окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/resource_planner"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. База данных

```bash
# Создать базу и применить схему
npm run db:migrate

# Заполнить демо-данными (объекты, сотрудники, договоры, нормативы)
npm run db:seed
```

### 5. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

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

## Продакшн деплой

```bash
npm run build
npm start
```

Рекомендуемые платформы: **Vercel** (бесплатно для небольших команд) + **Neon** или **Supabase** для PostgreSQL.
