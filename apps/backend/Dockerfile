FROM oven/bun:1.4.4
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/interfaces/package.json ./packages/interfaces/
RUN bun install --frozen-lockfile --production --ignore-scripts --filter @streamcat/backend --filter @streamcat/db

COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig.json ./apps/backend/
COPY packages/core/src ./packages/core/src
COPY packages/interfaces/src ./packages/interfaces/src
COPY packages/db/src ./packages/db/src
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/prisma.config.ts ./packages/db/
COPY tsconfig.base.json ./
COPY scripts/build-version.ts ./scripts/
COPY docker/secrets/load-env.ts /usr/local/bin/load-secrets.ts
RUN bun scripts/build-version.ts
WORKDIR /app/packages/db
RUN DB_PASSWORD=build bunx --no-install prisma generate --config prisma.config.ts
WORKDIR /app
ENV SECRETS_FILE=/run/streamcat-secrets/environment.json
EXPOSE 3002
USER bun
ENTRYPOINT ["bun", "/usr/local/bin/load-secrets.ts"]
CMD ["sh", "-c", "cd /app/packages/db && bunx --no-install prisma migrate deploy --config prisma.config.ts && cd /app/apps/backend && exec bun src/main.ts"]
