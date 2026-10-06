# SABOQ — production image
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# public/ bo'sh bo'lsa, Git uni saqlamaydi — keyingi bosqichdagi COPY xato bermasligi uchun yaratib qo'yamiz
RUN mkdir -p public
# Build paytida haqiqiy baza kerak emas — faqat o'zgaruvchi mavjud bo'lishi kifoya
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" NEXT_TELEMETRY_DISABLED=1
# prisma (migratsiyalar), tsx va dotenv (npm run db:seed) asosiy bog'liqliklarda — prune ularni o'chirmaydi
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/storage && chown -R node:node /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/messages ./messages
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3000
# Har ishga tushganda baza sxemasi yangilanadi, keyin sayt ishga tushadi
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3000"]
