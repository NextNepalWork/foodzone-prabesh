FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY server/package.json server/package-lock.json ./server/
RUN npm ci --omit=dev --prefix server \
    && npm cache clean --force

COPY server ./server

RUN mkdir -p /app/server/uploads/qr-codes /app/server/uploads/receipts \
    && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/server.js"]
