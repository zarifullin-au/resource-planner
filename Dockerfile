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

# Устанавливаем только runtime зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранное приложение и Prisma схему
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "-e", "require('child_process').execSync('npx prisma db push --skip-generate', {stdio: 'inherit'}); require('next/dist/bin/next').nextStart()"]
