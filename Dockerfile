# Multi-stage build per ottimizzare le dimensioni dell'immagine
FROM node:18-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./
COPY tsconfig.json ./

# Installa le dipendenze
RUN npm ci --only=production && npm cache clean --force

# Copia il codice sorgente
COPY src/ ./src/

# Compila TypeScript
RUN npm run build

# Stage finale per l'immagine di produzione
FROM node:18-alpine AS production

# Crea un utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs && 
    adduser -S website2markdown -u 1001

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file necessari dal builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Cambia proprietario dei file
RUN chown -R website2markdown:nodejs /app
USER website2markdown

# Espone la porta dell'applicazione
EXPOSE 3004

# Comando per avviare l'applicazione
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"