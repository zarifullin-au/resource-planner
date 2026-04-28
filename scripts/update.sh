#!/bin/bash
set -e

echo "🔄 Обновление Resource Planner..."

git pull

docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции схемы БД (безопасно — не затирает данные)
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "✅ Обновлено!"
