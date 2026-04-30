#!/bin/bash
set -e

echo "🔄 Обновление Resource Planner..."

git pull

docker-compose -f docker-compose.prod.yml up -d --build

# Применить схему БД (безопасно — не затирает данные, создаёт недостающие таблицы)
docker-compose -f docker-compose.prod.yml exec app npx prisma db push --skip-generate

echo "✅ Обновлено!"
