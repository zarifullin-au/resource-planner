#!/bin/bash
set -e

REPO_URL="https://github.com/zarifullin-au/resource-planner.git"
INSTALL_DIR="${1:-.}"

echo "📦 Resource Planner — Install Script"
echo "===================================="
echo ""

# Проверяем зависимости
if ! command -v node &> /dev/null; then
  echo "❌ Node.js не установлен. Установите Node.js 18+ с https://nodejs.org"
  exit 1
fi

if ! command -v psql &> /dev/null && [ -z "$DATABASE_URL" ]; then
  echo "⚠️  PostgreSQL не найден в PATH"
  echo "   Используйте облачную БД (Supabase/Neon) или установите PostgreSQL локально"
  echo ""
fi

echo "✅ Проверки пройдены"
echo ""

# Клонируем или используем текущую папку
if [ "$INSTALL_DIR" == "." ] && [ ! -f "package.json" ]; then
  echo "📥 Клонирую репозиторий..."
  git clone "$REPO_URL" resource-planner
  cd resource-planner
else
  echo "📁 Используем текущую папку"
  cd "$INSTALL_DIR"
fi

echo ""
echo "📦 Установка зависимостей..."
npm install

echo ""
echo "⚙️  Создание .env файла..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "📝 Отредактируйте .env:"
  echo "   DATABASE_URL — ваша PostgreSQL строка подключения"
  echo "   NEXTAUTH_SECRET — уже сгенерирован (openssl rand -base64 32)"
  echo "   NEXTAUTH_URL — для локальной разработки: http://localhost:3000"
  echo ""
  echo "Примеры:"
  echo "  Локально: postgresql://postgres:password@localhost:5432/resource_planner"
  echo "  Supabase: postgresql://[user]:[password]@[host]/[database]"
  echo "  Neon: postgresql://[user]:[password]@[host]/[database]"
  echo ""

  read -p "Press Enter когда отредактировали .env... " -r
else
  echo "✅ .env уже существует"
fi

echo ""
echo "🗄️  Инициализация БД..."
npm run db:push

echo ""
echo "🌱 Загрузка демо-данных..."
npm run db:seed

echo ""
echo "✨ Установка завершена!"
echo ""
echo "🚀 Для запуска:"
echo "   npm run dev"
echo ""
echo "📖 Доступ:"
echo "   URL: http://localhost:3000"
echo "   Email: admin@example.com"
echo "   Пароль: admin123"
echo ""
