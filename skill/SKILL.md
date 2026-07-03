---
name: w2m-cli
description: 'Use the w2m CLI to convert websites to markdown, discover URLs, extract structured content, diff pages, search text, chunk for LLM, map topics, and analyze sitemaps. Trigger ANY TIME the user mentions: converting a website to markdown, extracting content from a URL as markdown, downloading a site as text/markdown files, using w2m, checking website content via CLI, dumping a website''s pages into markdown files, discovering website structure, comparing pages, searching site content, chunking for AI, or topic mapping. Also trigger when the user asks about robots.txt content or wants to scrape website text content. This skill is available when the w2m CLI is installed (npm install -g website2markdown) and the API server is running.'
---

# w2m CLI skill

Il CLI `w2m` converte siti web in markdown chiamando l'API Website to Markdown Converter.

## Prerequisiti

Il server API deve essere in esecuzione. Di default il CLI punta a `http://localhost:3004`.

## Configurazione

La configurazione si passa via flag del comando, variabili d'ambiente o file di configurazione persistente. L'ordine di priorità è:

1. Flag CLI (`--api-url`, `--api-key`) — sovrascrive tutto
2. Variabili d'ambiente (`W2M_API_URL`, `W2M_API_KEY` / `X_API_KEY`)
3. File di configurazione (`~/.w2m/config.json`)
4. Default: `http://localhost:3004`

### Configurazione persistente

```bash
# Salva URL e API key in ~/.w2m/config.json (una volta sola)
w2m configure --api-url http://localhost:3004 --api-key la-chiave
```

### Flag espliciti

```bash
w2m status --api-url http://localhost:3004 --api-key la-chiave
```

### Variabili d'ambiente

```bash
export W2M_API_URL=http://localhost:3004
export W2M_API_KEY=la-chiave
```

La variabile `X_API_KEY` è anche letta automaticamente dal file `.env` nella directory del progetto.

## Comandi

### w2m status

Verifica che il server risponda e mostra tutti gli endpoint disponibili.

```bash
w2m status
```

### w2m health

Health check rapido del server.

```bash
w2m health
```

### w2m configure

Salva URL e API key in `~/.w2m/config.json` in modo persistente.

```bash
w2m configure --api-url http://localhost:3004 --api-key la-tua-chiave
```

### w2m single &lt;url&gt;

Converte una singola pagina web in markdown.

```bash
# Output a console
w2m single https://example.com/pagina

# Salva su file
w2m single https://example.com/pagina --output pagina.md
```

### w2m convert &lt;url&gt;

Converte un intero sito web in markdown.

```bash
# Output sommario a console
w2m convert https://example.com

# Con limite pagine
w2m convert https://example.com --max-pages 50

# Salva tutti i file in una directory
w2m convert https://example.com --output ./documentazione

# Modalità illimitata
w2m convert https://example.com --max-pages 0
```

### w2m discover &lt;url&gt;

Scopre URL di un sito web senza convertirli.

```bash
# Output a console (con badge sorgente: 🗺️ sitemap, 🤖 robots, 🕷️ crawl)
w2m discover https://example.com

# Output JSON
w2m discover https://example.com --json
```

### w2m extract &lt;url&gt;

Estrae contenuto strutturato completo di una pagina.

```bash
# Output sommario: meta, headings, link, date
w2m extract https://example.com/articolo

# Salva estrazione JSON
w2m extract https://example.com/articolo --output report.json

# Mostra anche il markdown
w2m extract https://example.com/articolo --md
```

Output include: `title`, `metaTitle`, `metaDescription`, `h1`, `headings` (con livello), `canonical`, `lang`, `markdown`, `wordCount`, `linksInternal`, `linksExternal`, `publishedAt`.

### w2m diff

Confronta due pagine web o due file markdown.

```bash
# Tra due URL
w2m diff -u1 https://sito.it/a -u2 https://sito.it/b

# Tra due file
w2m diff -m1 file1.md -m2 file2.md

# Output JSON
w2m diff -u1 https://sito.it/a -u2 https://sito.it/b --json
```

Output: similarità percentuale, heading mancanti, topic unici e comuni.

### w2m search &lt;query&gt;

Cerca testo in file .md o pagine convertite.

```bash
# Cerca in directory
w2m search "keyword" --dir ./docs

# Scopri e cerca su un sito
w2m search "keyword" --url https://example.com
```

### w2m chunk &lt;source&gt;

Divide markdown in blocchi ottimizzati per LLM.

```bash
# Da URL
w2m chunk https://example.com/documento

# Da file
w2m chunk documento.md

# Parametri
w2m chunk documento.md --max-tokens 300 --overlap 30
```

Output: chunk con `text`, `headingPath`, `tokenEstimate`, `wordEstimate`, `sourceUrl`.

### w2m map-topics &lt;url&gt;

Mappa i topic principali di un sito con cluster e gap suggeriti.

```bash
w2m map-topics https://example.com
w2m map-topics https://example.com --min-frequency 3
w2m map-topics https://example.com --json
```

### w2m batch &lt;urls...&gt;

Converte una lista specifica di URL con concorrenza controllata.

```bash
w2m batch https://example.com/a https://example.com/b
w2m batch https://example.com/a https://example.com/b -c 5
w2m batch https://example.com/a https://example.com/b -o ./output
```

### w2m sitemap &lt;url&gt;

Analizza la sitemap di un sito: struttura, tipo, URL con lastmod.

```bash
w2m sitemap https://example.com
w2m sitemap https://example.com --json
```

### w2m robots &lt;url&gt;

Scarica il contenuto del robots.txt di un sito web.

```bash
w2m robots https://example.com
w2m robots https://example.com --output robots.txt
```

### w2m update

Aggiorna w2m all'ultima versione da GitHub.

```bash
w2m update
```

## Workflow tipici

### 0. Configurazione iniziale (prima volta)

```bash
w2m configure --api-url https://w2m.otomatik.it --api-key la-tua-chiave
```

### 1. Verifica connessione

```bash
w2m health && w2m status
```

### 2. Scoprire la struttura di un sito

```bash
w2m discover https://sito-complesso.it --max-pages 200
```

### 3. Estrarre contenuto strutturato di una pagina

```bash
w2m extract https://sito.it/articolo --output analisi.json --md
```

### 4. Confrontare due pagine

```bash
w2m diff -u1 https://sito.it/nostro-articolo -u2 https://competitor.it/articolo
```

### 5. Scaricare un intero sito di documentazione

```bash
w2m convert https://docs.servizio.it --output ./docs --max-pages 200
```

### 6. Cercare contenuti specifici

```bash
w2m search "visite obbligatorie" --dir ./docs
```

### 7. Preparare chunk per RAG/LLM

```bash
w2m chunk https://docs.servizio.it/guida --max-tokens 500 --json
```

### 8. Mappare topic e scoprire gap editoriali

```bash
w2m map-topics https://sito.it --json | jq '.suggestedGaps'
```

### 9. Batch di URL mirati

```bash
w2m batch https://sito.it/a https://sito.it/b https://sito.it/c -o ./output
```
