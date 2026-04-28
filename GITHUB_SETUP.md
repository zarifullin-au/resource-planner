# Выкладывание на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Перейдите на https://github.com/new
2. Заполните:
   - **Repository name:** `resource-planner`
   - **Description:** `Система планирования нагрузки сотрудников (Next.js + PostgreSQL)`
   - **Public** или **Private** — на ваш выбор
   - Не инициализируйте README, .gitignore, лицензию (они уже есть)
3. Нажмите "Create repository"

## Шаг 2: Подготовка локального репозитория

```bash
cd /Users/user/Resource\ Planner/resource-planner

# Проверьте текущий статус
git status

# Добавьте все измененные файлы
git add README.md scripts/ Dockerfile docker-compose*.yml .dockerignore .env.docker GITHUB_SETUP.md

# Создайте коммит
git commit -m "Добавлена установка через npm/Docker, README обновлен"
```

## Шаг 3: Добавьте remote и загрузите

```bash
# Используйте zarifullin-au
git remote add origin https://github.com/zarifullin-au/resource-planner.git
git branch -M main
git push -u origin main
```

Или если remote уже существует:

```bash
git remote set-url origin https://github.com/zarifullin-au/resource-planner.git
git push -u origin main
```

## Шаг 4: Обновите ссылки в файлах

✅ Ссылки уже обновлены для пользователя `zarifullin-au`

## Проверка

После push проверьте:
- [ ] Все файлы загружены: https://github.com/zarifullin-au/resource-planner
- [ ] README отображается правильно
- [ ] Тэги и бранчи видны

## Дополнительно (опционально)

### Добавьте GitHub Actions для CI/CD

Создайте `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

### Добавьте лицензию

Рекомендуем MIT лицензию:

```bash
curl https://opensource.org/licenses/MIT > LICENSE
```

## Готово! 🎉

Ваше приложение готово для установки:

```bash
curl -sSL https://raw.githubusercontent.com/zarifullin-au/resource-planner/main/scripts/install.sh | bash
```

Или через Docker:

```bash
git clone https://github.com/zarifullin-au/resource-planner.git
cd resource-planner
docker-compose up -d
```
