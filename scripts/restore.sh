#!/bin/bash
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Использование: ./scripts/restore.sh ./backups/backup_2024-01-01_12-00-00.sql.gz"
  echo ""
  echo "Доступные бэкапы:"
  ls -lh ./backups/backup_*.sql.gz 2>/dev/null || echo "  (бэкапы не найдены)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Файл не найден: $BACKUP_FILE"
  exit 1
fi

read -p "⚠️  Восстановление ПЕРЕЗАПИШЕТ все текущие данные. Продолжить? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Отменено."
  exit 0
fi

echo "🔄 Восстановление из $BACKUP_FILE..."

gunzip -c "$BACKUP_FILE" | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres resource_planner

echo "✅ Восстановление завершено!"
