FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node scripts/pump-monitor.mjs /app/pump-monitor.mjs
USER node
CMD ["node", "/app/pump-monitor.mjs"]
