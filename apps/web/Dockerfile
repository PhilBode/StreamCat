FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/interfaces/package.json ./packages/interfaces/
RUN bun install --frozen-lockfile --ignore-scripts --filter @streamcat/web
COPY apps/web ./apps/web
COPY packages/core/src ./packages/core/src
COPY packages/interfaces/src ./packages/interfaces/src
COPY scripts/build-version.ts ./scripts/
# Rewrites are compiled into the image; Docker always uses this service name.
ENV BACKEND_URL=http://backend:3002 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1.4.4
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/.next/cache && chown -R bun:bun /app/apps/web/.next/cache
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 BACKEND_URL=http://backend:3002
EXPOSE 3000
USER bun
CMD ["bun", "apps/web/server.js"]
