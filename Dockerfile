# Мультистадийный Dockerfile для Next.js приложения

# Stage 1: Зависимости и сборка
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем Next.js приложение
RUN npm run build && mkdir -p /app/public

# Stage 2: Продакшн образ
FROM node:18-alpine

WORKDIR /app

# Устанавливаем openssl и другие зависимости для Prisma
RUN apk add --no-cache openssl

# Копируем package.json и устанавливаем только runtime зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем все необходимые файлы из builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Запускаем миграции БД (перед переключением пользователя)
ENV NODE_ENV=production
RUN npx prisma db push --skip-generate || true

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node_modules/.bin/next", "start"]
