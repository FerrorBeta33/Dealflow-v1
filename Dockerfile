FROM node:22.23.2-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --no-audit --no-fund
COPY apps ./apps
COPY shared ./shared
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22.23.2-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production API_PORT=8080 DATA_DIR=/app/.data
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/shared ./shared
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/server.js"]
