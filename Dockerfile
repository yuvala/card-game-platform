FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY apps/ ./apps/
COPY packages/ ./packages/
COPY scripts/resolve-engine-aliases.cjs ./scripts/
COPY tsconfig.server.json ./

RUN npx tsc -p tsconfig.server.json
RUN node scripts/resolve-engine-aliases.cjs .tmp-server

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["node", ".tmp-server/apps/server/src/gameServer.js"]
