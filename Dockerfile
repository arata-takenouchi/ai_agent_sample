# Node.js 18のベースイメージを使用
FROM node:18-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
RUN npm ci --only=production

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# .envファイルをコピー（存在する場合）
COPY .env* ./

# Next.jsアプリケーションをビルド
RUN npm run build

# 実行用ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# .envファイルをコピー（存在する場合）
COPY --from=builder --chown=nextjs:nodejs /app/.env* ./

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]