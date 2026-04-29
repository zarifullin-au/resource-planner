# Развёртывание на продакшн сервер

## Требования

- Docker и Docker Compose
- PostgreSQL (или создастся в контейнере)
- `.env` файл с необходимыми переменными

## Подготовка сервера

### 1. Клонировать репозиторий

```bash
git clone https://github.com/zarifullin-au/resource-planner.git
cd resource-planner
```

### 2. Создать `.env` файл

```bash
cat > .env << 'EOF'
# PostgreSQL
DB_USER=postgres
DB_PASSWORD=your_strong_password_here_change_this
DB_NAME=resource_planner

# NextAuth
NEXTAUTH_URL=https://your-domain.com  # или http://ip:3000 для локальной сети
NEXTAUTH_SECRET=your_generated_secret_here
EOF
```

Генерируем случайный `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Запустить сервисы

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Docker автоматически:
- Собирает образ
- Создаёт PostgreSQL контейнер с волюмом `postgres_prod_data` (data persists)
- Запускает миграции БД
- Стартует приложение на порту 3000

### 4. Проверить логи

```bash
docker logs resource-planner-app-prod
```

Приложение готово когда видите: "ready started server on 0.0.0.0:3000"

## Обновление кода

```bash
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

Docker автоматически запустит миграции перед стартом.

## Резервное копирование и восстановление БД

### Создать резервную копию

```bash
./scripts/backup.sh
```

Создаст файл вида `./backups/resource_planner_2026-04-29_17-30.sql.gz`

### Восстановить из резервной копии

```bash
./scripts/restore.sh ./backups/resource_planner_2026-04-29_17-30.sql.gz
```

## Управление контейнерами

```bash
# Остановить
docker-compose -f docker-compose.prod.yml down

# Перезапустить
docker-compose -f docker-compose.prod.yml restart

# Просмотреть статус
docker ps | grep resource-planner

# Посмотреть логи PostgreSQL
docker logs resource-planner-db-prod
```

## Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|------------|---------|
| `DB_USER` | Нет (default: `postgres`) | Пользователь PostgreSQL |
| `DB_PASSWORD` | **Да** | Пароль PostgreSQL |
| `DB_NAME` | Нет (default: `resource_planner`) | Имя БД |
| `NEXTAUTH_URL` | **Да** | Base URL приложения (e.g. `https://planner.example.com`) |
| `NEXTAUTH_SECRET` | **Да** | Случайный секрет для JWT (генерируется `openssl rand -base64 32`) |

## Дефолтный логин после инициализации

Email: `admin@example.com`  
Пароль: `admin123`

⚠️ **Измените пароль после первого входа!**

## Проблемы при развёртывании

### Контейнер постоянно перезапускается

```bash
docker logs resource-planner-app-prod
```

Проверьте:
- Все ли переменные в `.env` установлены?
- Доступна ли PostgreSQL? (`docker logs resource-planner-db-prod`)
- Правильный ли `NEXTAUTH_URL`?

### "permission denied" при работе с файлами

Приложение запущено от непривилегированного пользователя (`nextjs`). Если нужны rights на папки:

```bash
docker exec resource-planner-app-prod sh -c "ls -la /app"
```

### PORT 3000 уже используется

Измените port в `docker-compose.prod.yml`:

```yaml
ports:
  - "8080:3000"  # Слушает на localhost:8080
```
