# Build stage — bakes in NEXT_PUBLIC_ env vars at compile time
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_POSTHOG_KEY=""
ARG NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# NextAuth requires NEXTAUTH_SECRET at build time to initialise.
# The real value is injected at runtime via docker-compose env; this
# placeholder just satisfies the build-time check.
ARG NEXTAUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

RUN npm run build

# Runtime stage — only what's needed to serve
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]
