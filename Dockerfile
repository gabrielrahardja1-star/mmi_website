# syntax=docker/dockerfile:1
#
# Three images from one file:
#   runner  the website + editor (what `docker compose up` runs)
#   tools   migrations, seeding, creating users, cleanup (run on demand, see docker-compose.yml)
#   build   intermediate, not used on its own

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# No secrets are needed to build: configuration is read when the app starts.
RUN npm run build

FROM deps AS tools
COPY . .
ENV NODE_ENV=production
CMD ["node", "-e", "console.log('Run a script: docker compose run --rm tools npm run db:migrate')"]

FROM base AS runner
# HOSTNAME must stay 0.0.0.0. Next decides whether src/proxy.ts's rewrites are "internal" by comparing
# addresses derived from it; with another value (say 127.0.0.1) every page returns 404 behind nginx.
# deploy/verify.sh catches this.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Uploaded photos live here. docker-compose.yml bind-mounts a host folder over it.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "server.js"]
