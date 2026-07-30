# --- Stage 1: dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# --- Stage 2: build ---
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Stage 3: productie-runtime (klein, alleen wat nodig is) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Niet als root draaien
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# data/db.json wordt hierna overschaduwd door een gemount volume in
# docker-compose — dit is alleen de fallback als er (nog) geen volume is.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chmod=755 /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
