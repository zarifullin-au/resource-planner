#!/bin/bash
set -e

echo "🔄 Обновление Resource Planner..."

git pull

docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Обновлено!"
