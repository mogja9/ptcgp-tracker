# syntax=docker/dockerfile:1.7

# Build the Next.js app
FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 needs a working toolchain to compile its native module.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Slim runtime image
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001

# Same native deps so better-sqlite3 can run; sqlite3 cli is handy for ops.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates sqlite3 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json

VOLUME ["/app/data"]
EXPOSE 3001
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s \
  CMD wget -qO- "http://127.0.0.1:3001/api/health" >/dev/null || exit 1

CMD ["npm", "run", "start"]
