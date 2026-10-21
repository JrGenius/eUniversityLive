# Build : compilation du web (React/Vite) et du serveur (TypeScript).
# NODE_ENV=development est limité à npm ci : Coolify injecte les variables
# d'environnement au build, et npm sautait les devDependencies sinon.
# Les builds tournent en NODE_ENV=production : un bundle React en mode
# développement activerait StrictMode et casserait les envois de réponses.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
COPY server/prisma server/prisma
RUN NODE_ENV=development npm ci
COPY . .
RUN cd server && npx prisma generate && cd /app && NODE_ENV=production npm run build -w web && npm run build -w server

# Runtime : uniquement les dépendances de production du serveur
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY server/prisma server/prisma
RUN npm ci --omit=dev --workspace=server && cd server && npx prisma generate
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
WORKDIR /app/server
EXPOSE 3100
# Migrations + compte professeur (idempotent) puis démarrage.
# Si JEREMIE_PASSWORD est défini, crée aussi le compte jeremie@genius.ci et les 8 quiz IWD.
CMD ["sh", "-c", "ok=0; for i in $(seq 1 20); do npx prisma migrate deploy && ok=1 && break; sleep 3; done; [ $ok = 1 ] || exit 1; node dist/seed.js; if [ -n \"$JEREMIE_PASSWORD\" ]; then node dist/seed-iwd.js; fi; exec node dist/index.js"]
