# Build : compilation du web (React/Vite) et du serveur (TypeScript)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY . .
RUN npx prisma generate --schema=server/prisma/schema.prisma \
    && npm run build -w web \
    && npm run build -w server

# Runtime : uniquement les dépendances de production du serveur
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm ci --omit=dev --workspace=server && npx prisma generate --schema=server/prisma/schema.prisma
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/web/dist web/dist
WORKDIR /app/server
EXPOSE 3100
# Migrations + compte professeur (idempotent) puis démarrage
CMD ["sh", "-c", "ok=0; for i in $(seq 1 20); do npx prisma migrate deploy && ok=1 && break; sleep 3; done; [ $ok = 1 ] || exit 1; node dist/seed.js; exec node dist/index.js"]
