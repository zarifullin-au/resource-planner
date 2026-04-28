#!/bin/bash
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "💾 Создание резервной копии БД..."

docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres resource_planner | gzip > "$BACKUP_DIR/$FILENAME"

echo "✅ Бэкап сохранён: $BACKUP_DIR/$FILENAME"

# Удалить бэкапы старше 30 дней
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
echo "🧹 Старые бэкапы (>30 дней) удалены"
