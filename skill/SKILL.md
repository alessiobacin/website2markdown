---
name: w2m-cli
description: 'Use the w2m CLI to convert websites to markdown. Trigger ANY TIME the user mentions: converting a website to markdown, extracting content from a URL as markdown, downloading a site as text/markdown files, using w2m, checking website content via CLI, or dumping a website''s pages into markdown files. Also trigger when the user asks about robots.txt content or wants to scrape website text content. This skill is available when the w2m CLI is installed (npm install -g website2markdown) and the API server is running.'
---

# w2m CLI skill

Il CLI `w2m` converte siti web in markdown chiamando l'API Website to Markdown Converter.

## Prerequisiti

Il server API deve essere in esecuzione. Di default il CLI punta a `http://localhost:3004`.

## Configurazione

La configurazione si passa via flag del comando o variabili d'ambiente:

```bash
# Flag
w2m status --api-url http://localhost:3004 --api-key la-chiave

# Oppure variabili d'ambiente
export W2M_API_URL=http://localhost:3004
export W2M_API_KEY=la-chiave
```

La variabile `X_API_KEY` è anche letta automaticamente dal file `.env` nella directory del progetto.

## Comandi

### w2m status

Verifica che il server risponda e mostra gli endpoint disponibili.

```bash
w2m status
```

### w2m health

Health check rapido del server.

```bash
w2m health
```

### w2m single <url>

Converte una singola pagina web in markdown.

```bash
# Output a console
w2m single https://example.com/pagina

# Salva su file
w2m single https://example.com/pagina --output pagina.md

# Con API key esplicita
w2m single https://example.com --api-key la-chiave
```

### w2m convert <url>

Converte un intero sito web in markdown. Scopre automaticamente tutte le pagine via sitemap.xml, robots.txt e crawling.

```bash
# Output sommario a console
w2m convert https://example.com

# Con limite pagine
w2m convert https://example.com --max-pages 50

# Salva tutti i file in una directory
w2m convert https://example.com --output ./documentazione

# Modalità illimitata (scarica tutto ciò che trova)
w2m convert https://example.com --max-pages 0
```

Il flag `--output <dir>` crea un file `.md` per ogni pagina scoperta, con nome derivato dal path URL.

### w2m robots <url>

Scarica il contenuto del robots.txt di un sito web.

```bash
# Stampa a console
w2m robots https://example.com

# Salva su file
w2m robots https://example.com --output robots.txt
```

## Workflow tipici

### 1. Verifica connessione e converti una pagina

```bash
w2m health && \
w2m single https://example.com/docs/guida --output guida.md
```

### 2. Scaricare un intero sito di documentazione

```bash
w2m convert https://docs.servizio.it --output ./docs --max-pages 200
```

### 3. Analizzare la struttura di un sito prima di convertirlo

```bash
w2m robots https://sito-complesso.it
w2m status
```

### 4. Estrazione rapida con verifica

```bash
w2m health && w2m status && w2m convert https://example.com --max-pages 10
```
