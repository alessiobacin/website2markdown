# Website to Markdown Converter

Servizio API REST + CLI per convertire interi siti web in contenuto markdown strutturato. Scopre automaticamente tutte le pagine di un sito attraverso sitemap.xml, robots.txt e crawling della homepage, poi le converte in formato markdown.

## Caratteristiche

- **Scoperta automatica pagine** tramite sitemap.xml, robots.txt e crawling
- **Conversione in markdown** di pagine singole o interi siti
- **Discovery dedicato** — scopri URL senza convertirli, con sorgente (`sitemap`, `robots`, `crawl`)
- **Estrazione strutturata** — metaTitle, metaDescription, h1, headings, canonical, lang, link interni/esterni, publishedAt
- **Confronto contenuti** — diff tra due pagine o blocchi markdown con similarità, heading mancanti, topic unici
- **Ricerca testuale** — cerca su corpus convertito con snippet di contesto
- **Chunking per LLM** — spezza markdown in blocchi con heading path e stima token
- **Topic mapping** — cluster di topic, gap suggeriti
- **Batch controllato** — converti URL specifici con concorrenza configurabile
- **Analisi sitemap** — endpoint dedicato per struttura e dettagli sitemap
- **Modalità unlimited** — scarica TUTTE le pagine scoperte (maxPages: 0)
- **Crawling secondario** — segue link interni per scoprire più pagine
- **Crawling blog/archivi** — supporto paginazione per `/blog/`, `/news/`, ecc.
- **CLI nativa** (`w2m`) — interagisci con l'API da terminale
- **Autenticazione API** tramite `x-api-key`
- **Robustezza** — continua anche se pagine singole falliscono

## Installazione

### Server

```bash
git clone <repo>
cd website2markdown
npm install
```

Configura il file `.env`:

```env
X_API_KEY=la-tua-chiave-api
PORT=3004
HOST=0.0.0.0
REQUEST_TIMEOUT=30000
```

Avvia il server:

```bash
npm run build
npm start

# Sviluppo con hot-reload:
npm run dev
```

### CLI

La CLI `w2m` è inclusa nel package e si installa globalmente.

#### One-liner (da GitHub)

```bash
curl -sSL https://raw.githubusercontent.com/alessiobacin/website2markdown/main/scripts/install.sh | bash
```

**Mac / Linux / Windows (WSL):** scarica, compila e installa `w2m` automaticamente.

#### One-liner via npm

```bash
npm install -g github:alessiobacin/website2markdown
```

Funziona su **Mac, Linux e Windows PowerShell**. Il package è pubblico su GitHub.

#### Uso diretto (nessuna installazione)

```bash
npx github:alessiobacin/website2markdown w2m --help
```

#### Installazione manuale

```bash
git clone https://github.com/alessiobacin/website2markdown.git
cd website2markdown
npm install
npm run build
npm link              # → w2m disponibile globalmente
```

Per Windows PowerShell, gli stessi comandi funzionano identici. In alternativa, esegui lo script dedicato:

| Piattaforma | Script |
|-------------|--------|
| Mac / Linux | `bash scripts/install.sh` |
| Windows     | `.\scripts\install.ps1` |

## API

Tutti gli endpoint API richiedono l'header `x-api-key` (tranne `/health`).

### POST /api/convert

Converte un intero sito web in markdown, scoprendo tutte le pagine.

**Request:**

```json
{
  "url": "example.com",
  "maxPages": 100
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `url` | string | — | URL del sito (obbligatorio) |
| `maxPages` | number | 100 | Max pagine (max 500; `0` = illimitato) |

**Response (200):**

```json
{
  "success": true,
  "domain": "example.com",
  "totalPages": 25,
  "pages": [
    {
      "url": "https://example.com/page-1",
      "title": "Titolo Pagina",
      "markdown": "# Titolo\n\nContenuto in markdown...",
      "wordCount": 150
    }
  ],
  "timestamp": "2026-07-02T20:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/convert \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url": "example.com", "maxPages": 50}'
```

### POST /api/convert/single

Converte una singola pagina web in markdown.

**Request:**

```json
{
  "url": "example.com/una-pagina"
}
```

**Response (200):**

```json
{
  "success": true,
  "url": "https://example.com/una-pagina",
  "title": "Titolo Pagina",
  "markdown": "# Titolo\n\nContenuto...",
  "wordCount": 85,
  "timestamp": "2026-07-02T20:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/convert/single \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url": "example.com/una-pagina"}'
```

### GET /api/convert/status

Stato del servizio e lista degli endpoint disponibili.

**Response (200):**

```json
{
  "service": "Website to Markdown Converter",
  "status": "active",
  "version": "1.0.0",
  "endpoints": {
    "convert": "POST /api/convert",
    "single": "POST /api/convert/single",
    "batch-single": "POST /api/convert/batch-single",
    "discover": "POST /api/discover",
    "extract": "POST /api/extract",
    "diff": "POST /api/diff",
    "search": "POST /api/search",
    "chunk": "POST /api/chunk",
    "map-topics": "POST /api/map-topics",
    "sitemap": "GET /api/sitemap?url=<sito>",
    "robots-txt": "GET /api/robots-txt?url=<sito>",
    "status": "GET /api/convert/status"
  }
}
```

### GET /api/robots-txt?url=&lt;sito&gt;

Scarica il contenuto del file robots.txt di un sito web.

| Query param | Tipo | Descrizione |
|-------------|------|-------------|
| `url` | string | URL del sito (obbligatorio) |

**Response (200):**

```json
{
  "success": true,
  "domain": "github.com",
  "sourceUrl": "https://github.com/robots.txt",
  "content": "User-agent: *\nDisallow: /search\n..."
}
```

**cURL:**

```bash
curl -H "x-api-key: la-tua-chiave" \
  "http://localhost:3004/api/robots-txt?url=github.com"
```

### POST /api/discover

Scopre URL di un sito web senza convertirli, indicando la sorgente di ciascun URL.

**Request:**

```json
{
  "url": "example.com",
  "maxPages": 100
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `url` | string | — | URL del sito (obbligatorio) |
| `maxPages` | number | 100 | Max URL (max 5000; `0` = illimitato) |

**Response (200):**

```json
{
  "success": true,
  "domain": "example.com",
  "totalUrls": 42,
  "urls": [
    { "url": "https://example.com/", "source": "sitemap" },
    { "url": "https://example.com/contatti", "source": "crawl" }
  ],
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/discover \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url": "example.com", "maxPages": 20}'
```

### POST /api/extract

Estrae contenuto strutturato completo di una singola pagina web.

**Request:**

```json
{
  "url": "example.com/articolo"
}
```

**Response (200):**

```json
{
  "success": true,
  "url": "https://example.com/articolo",
  "title": "Titolo Pagina",
  "metaTitle": "Titolo SEO | Sito",
  "metaDescription": "Descrizione SEO della pagina",
  "h1": ["Titolo Principale"],
  "headings": [
    { "level": 2, "text": "Sottosezione 1" },
    { "level": 3, "text": "Dettaglio" }
  ],
  "canonical": "https://example.com/articolo",
  "lang": "it",
  "markdown": "# Titolo\n\nContenuto...",
  "wordCount": 850,
  "linksInternal": ["https://example.com/altra-pagina"],
  "linksExternal": ["https://altro-sito.it"],
  "linksInternalCount": 5,
  "linksExternalCount": 3,
  "publishedAt": "2026-06-15T10:00:00.000Z",
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/extract \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url": "example.com/articolo"}'
```

### POST /api/diff

Confronta due pagine o due blocchi markdown. Accetta coppie di URL o di markdown.

**Request (URL):**

```json
{
  "url1": "example.com/pagina1",
  "url2": "example.com/pagina2"
}
```

**Request (markdown):**

```json
{
  "markdown1": "# Titolo A\n\nContenuto A...",
  "markdown2": "# Titolo B\n\nContenuto B..."
}
```

**Response (200):**

```json
{
  "success": true,
  "source1": "example.com/pagina1",
  "source2": "example.com/pagina2",
  "stats": {
    "wordCount1": 450,
    "wordCount2": 620,
    "headingCount1": 5,
    "headingCount2": 7,
    "similarityPercent": 34
  },
  "differences": {
    "headingsMissingInSource2": [
      { "level": 2, "text": "Sezione solo in pagina 1" }
    ],
    "headingsMissingInSource1": [
      { "level": 2, "text": "Sezione solo in pagina 2" }
    ]
  },
  "topics": {
    "common": ["marketing", "strategia"],
    "uniqueToSource1": ["social", "brand"],
    "uniqueToSource2": ["vendite", "crm"]
  },
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/diff \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url1": "example.com/pagina1", "url2": "example.com/pagina2"}'
```

### POST /api/search

Ricerca testuale su pagine convertite, con snippet di contesto.

**Request:**

```json
{
  "query": "obbligatorie",
  "pages": [
    { "url": "https://example.com/visite", "markdown": "# Visite obbligatorie...", "title": "Visite" },
    { "url": "https://example.com/normative", "markdown": "# Normative...", "title": "Normative" }
  ],
  "caseSensitive": false
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `query` | string | — | Testo da cercare (obbligatorio) |
| `pages` | array | — | Array di pagine con `url` e `markdown` (obbligatorio) |
| `caseSensitive` | boolean | false | Ricerca case-sensitive |

**Response (200):**

```json
{
  "success": true,
  "query": "obbligatorie",
  "totalResults": 1,
  "totalMatches": 3,
  "results": [
    {
      "url": "https://example.com/visite",
      "title": "Visite",
      "matches": 3,
      "contextSnippets": [
        "Elenco delle visite obbligatorie per legge",
        "Le visite obbligatorie includono..."
      ]
    }
  ],
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"query": "obbligatorie", "pages": [{"url": "https://example.com/test", "markdown": "# Test\\n\\nVisite obbligatorie"}]}'
```

### POST /api/chunk

Suddivide markdown lungo in blocchi ottimizzati per LLM, con tracciamento heading path.

**Request:**

```json
{
  "markdown": "# Capitolo 1\n\nTesto lungo...\n\n## Sezione 1.1\n\nAltro testo...",
  "url": "https://example.com/documento",
  "maxTokens": 500,
  "overlap": 50
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `markdown` | string | — | Testo markdown da chunkare |
| `url` | string | — | URL alternativo per fetch ed estrazione automatica |
| `maxTokens` | number | 500 | Token massimi per chunk (stima ~4 caratteri/token) |
| `overlap` | number | 50 | Token di overlap tra chunk consecutivi |

**Response (200):**

```json
{
  "success": true,
  "totalChunks": 3,
  "maxTokens": 500,
  "overlap": 50,
  "chunks": [
    {
      "index": 0,
      "text": "# Capitolo 1\n\nTesto...",
      "headingPath": ["Capitolo 1"],
      "tokenEstimate": 120,
      "wordEstimate": 450,
      "sourceUrl": "https://example.com/documento"
    }
  ],
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/chunk \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"markdown": "# Test\n\nContenuto...", "maxTokens": 200}'
```

### POST /api/map-topics

Mappa i topic principali di un sito o di un set di pagine, con cluster e gap suggeriti.

**Request:**

```json
{
  "url": "example.com",
  "pages": [
    { "url": "https://...", "title": "Pagina 1", "markdown": "# Marketing..." }
  ],
  "minWordFrequency": 2
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `url` | string | — | URL sito (scopre ed estrae automaticamente) |
| `pages` | array | — | Array di pagine con `url`, `title`, `markdown` |
| `minWordFrequency` | number | 2 | Frequenza minima per considerare un topic |

**Response (200):**

```json
{
  "success": true,
  "totalPages": 25,
  "totalTopics": 48,
  "clusters": [
    {
      "topic": "marketing",
      "relatedTopics": ["social", "brand", "campagne"],
      "pages": [
        { "url": "https://example.com/marketing", "title": "Marketing Digitale" }
      ]
    }
  ],
  "pageTopics": [
    { "url": "https://example.com/marketing", "title": "Marketing Digitale", "topics": ["marketing", "social", "campagne"] }
  ],
  "suggestedGaps": [
    "Found 8 topics covered by only 1 page. Consider expanding these into clusters."
  ],
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/map-topics \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"url": "example.com"}'
```

### POST /api/convert/batch-single

Converte una lista specifica di URL con concorrenza controllata.

**Request:**

```json
{
  "urls": ["example.com/pagina1", "example.com/pagina2", "example.com/pagina3"],
  "concurrency": 3
}
```

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `urls` | array | — | Lista di URL da convertire (max 500) |
| `concurrency` | number | 3 | Richieste parallele (1-20) |

**Response (200):**

```json
{
  "success": true,
  "total": 3,
  "successCount": 2,
  "failedCount": 1,
  "results": [
    { "url": "https://example.com/pagina1", "success": true, "title": "Pagina 1", "markdown": "#...", "wordCount": 120 },
    { "url": "https://example.com/pagina2", "success": true, "title": "Pagina 2", "markdown": "#...", "wordCount": 85 },
    { "url": "https://example.com/pagina3", "success": false, "error": "Timeout" }
  ],
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3004/api/convert/batch-single \
  -H "Content-Type: application/json" \
  -H "x-api-key: la-tua-chiave" \
  -d '{"urls": ["example.com/pagina1", "example.com/pagina2"]}'
```

### GET /api/sitemap?url=&lt;sito&gt;

Analizza la sitemap di un sito web, mostrandone struttura e dettagli.

| Query param | Tipo | Descrizione |
|-------------|------|-------------|
| `url` | string | URL del sito (obbligatorio) |

**Response (200):**

```json
{
  "success": true,
  "found": true,
  "sitemapUrl": "https://example.com/sitemap.xml",
  "type": "sitemapindex",
  "totalUrls": 150,
  "urls": [
    { "loc": "https://example.com/", "lastmod": "2026-06-20" }
  ],
  "children": [
    { "url": "https://example.com/sitemap-pages.xml", "totalUrls": 100 }
  ],
  "status": "ok",
  "timestamp": "2026-07-03T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -H "x-api-key: la-tua-chiave" \
  "http://localhost:3004/api/sitemap?url=example.com"
```

### GET /health

Health check (non richiede autenticazione).

**Response (200):**

```json
{
  "status": "OK",
  "timestamp": "2026-07-02T20:00:00.000Z"
}
```

## CLI (`w2m`)

### Configurazione

La CLI cerca le credenziali in questo ordine: flag CLI > variabili d'ambiente > file di configurazione.

**Configurazione persistente (salvata in `~/.w2m/config.json`):**

```bash
w2m configure --api-url https://w2m.otomatik.it --api-key la-tua-chiave
```

Basta una volta, i comandi successivi non richiedono più flag.

**Variabili d'ambiente (alternativa):**

```bash
export W2M_API_URL=http://localhost:3004
export W2M_API_KEY=la-tua-chiave
```

**Flag espliciti (sovrascrivono tutto):**

```bash
w2m status --api-url http://localhost:3004 --api-key la-tua-chiave
```

### w2m convert &lt;url&gt;

Converte un intero sito in markdown.

```bash
# Output a console (sommario)
w2m convert example.com --max-pages 50

# Salva tutti i file .md in una directory
w2m convert example.com --output ./sito-docs

# Modalità illimitata (scarica tutto)
w2m convert example.com --max-pages 0
```

| Opzione | Descrizione |
|---------|-------------|
| `-m, --max-pages <n>` | Max pagine (default: 100, max: 500, 0 = illimitato) |
| `-o, --output <dir>` | Salva ogni pagina come `.md` nella directory |

### w2m single &lt;url&gt;

Converte una singola pagina.

```bash
# Output a console (titolo + markdown)
w2m single example.com/contatti

# Salva su file
w2m single example.com/contatti --output contatti.md
```

| Opzione | Descrizione |
|---------|-------------|
| `-o, --output <file>` | Salva il markdown su file invece che stdout |

### w2m robots &lt;url&gt;

Scarica il robots.txt di un sito.

```bash
# Stampa a console
w2m robots github.com

# Salva su file
w2m robots github.com --output github-robots.txt
```

| Opzione | Descrizione |
|---------|-------------|
| `-o, --output <file>` | Salva il contenuto su file invece che stdout |

### w2m status

Mostra lo stato del servizio API e la lista degli endpoint.

```bash
w2m status
```

### w2m discover &lt;url&gt;

Scopre URL di un sito web senza convertirli, mostrando la sorgente.

```bash
# Output a console
w2m discover example.com

# Output JSON
w2m discover example.com --json

# Con limite
w2m discover example.com --max-pages 50
```

| Opzione | Descrizione |
|---------|-------------|
| `-m, --max-pages <n>` | Max URL (default: 100, 0 = unlimited) |
| `--json` | Output in formato JSON |

### w2m extract &lt;url&gt;

Estrae contenuto strutturato completo di una pagina (meta, headings, link, ecc.).

```bash
# Output sommario a console
w2m extract example.com/articolo

# Salva estrazione JSON su file
w2m extract example.com/articolo --output estrazione.json

# Mostra anche il markdown
w2m extract example.com/articolo --md
```

| Opzione | Descrizione |
|---------|-------------|
| `-o, --output <file>` | Salva il JSON su file |
| `--md` | Mostra anche il markdown nell'output |

### w2m diff

Confronta due pagine Web o due file markdown.

```bash
# Confronto tra due URL
w2m diff -u1 example.com/pagina1 -u2 example.com/pagina2

# Confronto tra due file markdown
w2m diff -m1 file1.md -m2 file2.md

# Output JSON
w2m diff -u1 example.com/a -u2 example.com/b --json
```

| Opzione | Descrizione |
|---------|-------------|
| `-u1, --url1 <url>` | Primo URL |
| `-u2, --url2 <url>` | Secondo URL |
| `-m1, --markdown1 <file>` | File markdown 1 |
| `-m2, --markdown2 <file>` | File markdown 2 |
| `--json` | Output in formato JSON |

### w2m search &lt;query&gt;

Cerca testo in pagine convertite.

```bash
# Cerca in file .md in una directory
w2m search "obbligatorie" --dir ./documentazione

# Cerca in pagine scoperte da un URL
w2m search "marketing" --url example.com

# Output JSON
w2m search "keyword" --dir ./docs --json
```

| Opzione | Descrizione |
|---------|-------------|
| `-d, --dir <directory>` | Directory con file .md da cercare |
| `-u, --url <url>` | URL da cui scoprire e cercare pagine |
| `--json` | Output in formato JSON |

### w2m chunk &lt;source&gt;

Divide markdown in blocchi ottimizzati per LLM.

```bash
# Da URL (fetch + estrazione + chunking automatico)
w2m chunk https://example.com/documento

# Da file markdown locale
w2m chunk documento.md

# Con parametri personalizzati
w2m chunk documento.md --max-tokens 300 --overlap 30

# Output JSON
w2m chunk documento.md --json
```

| Opzione | Descrizione |
|---------|-------------|
| `-t, --max-tokens <n>` | Token massimi per chunk (default: 500) |
| `-o, --overlap <n>` | Token di overlap (default: 50) |
| `--json` | Output in formato JSON |

### w2m map-topics &lt;url&gt;

Mappa i topic principali di un sito, con cluster e gap suggeriti.

```bash
# Output a console
w2m map-topics example.com

# Con soglia personalizzata
w2m map-topics example.com --min-frequency 3

# Output JSON
w2m map-topics example.com --json
```

| Opzione | Descrizione |
|---------|-------------|
| `-m, --min-frequency <n>` | Frequenza minima parola (default: 2) |
| `--json` | Output in formato JSON |

### w2m batch &lt;urls...&gt;

Converte una lista specifica di URL con concorrenza controllata.

```bash
# Converti URL specifici
w2m batch https://example.com/a https://example.com/b https://example.com/c

# Con più concorrenza
w2m batch https://example.com/a https://example.com/b -c 5

# Salva su directory
w2m batch https://example.com/a https://example.com/b -o ./output
```

| Opzione | Descrizione |
|---------|-------------|
| `-c, --concurrency <n>` | Richieste parallele (default: 3) |
| `-o, --output <dir>` | Salva i file .md nella directory |

### w2m sitemap &lt;url&gt;

Analizza la sitemap di un sito: struttura, tipo, URL con lastmod.

```bash
# Output a console
w2m sitemap example.com

# Output JSON
w2m sitemap example.com --json
```

### w2m health

Health check rapido del server.

```bash
w2m health
```

### w2m update

Aggiorna w2m all'ultima versione da GitHub. Rileva automaticamente se è installato via git (`~/.w2m`) o npm globale e aggiorna di conseguenza.

```bash
w2m update
```

### Esempi combinati

```bash
# Esporta variabili d'ambiente
export W2M_API_URL=http://localhost:3004
export W2M_API_KEY=nb_api_2024_...

# Converti un sito intero e salva su disco
w2m convert docs.servizionline.it --max-pages 0 --output ./documentazione

# Converti una pagina singola
w2m single docs.servizionline.it/guida-introduttiva --output guida.md

# Scarica robots.txt per riferimento
w2m robots docs.servizionline.it --output robots.txt

# Verifica che il server risponda
w2m health
```

## Configurazione

### Variabili d'ambiente (Server)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `X_API_KEY` | — | Chiave API per autenticazione |
| `PORT` | 3004 | Porta del server |
| `HOST` | 0.0.0.0 | Host su cui ascoltare |
| `REQUEST_TIMEOUT` | 30000 | Timeout richieste HTTP in ms |

### Variabili d'ambiente (CLI)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `W2M_API_URL` | http://localhost:3004 | URL del server API |
| `W2M_API_KEY` | — | API key (legge anche `X_API_KEY`) |

## Come funziona

### Flusso di conversione (`POST /api/convert`)

```
URL input
  │
  ├── 1. Parso robots.txt → estrae eventuali sitemap
  ├── 2. Parso sitemap.xml → estrae URL pagine
  ├── 3. Crawling homepage → link interni
  └── 4. Crawling secondario → link da pagine scoperte
         ├── link interni standard
         └── paginazione blog/archivi (/page/2/, /page/3/, ...)
  │
  └── 5. Ogni pagina viene convertita:
         ├── download HTML
         ├── cheerio → estrae title + contenuto (main/article)
         └── turndown → HTML → Markdown
```

Per `POST /api/convert/single` il flusso è diretto: download HTML → estrazione contenuto → markdown.

### Flusso di discovery (`POST /api/discover`)

```
URL input
  │
  ├── 1. Parso sitemap.xml → URL con source: "sitemap"
  ├── 2. Parso robots.txt → URL con source: "robots"
  └── 3. Crawling homepage → URL con source: "crawl"
  │
  └── Output: array di { url, source, lastmod? }
```

### Flusso di estrazione (`POST /api/extract`)

```
URL input
  │
  ├── 1. Download HTML
  ├── 2. cheerio → estrazione metadata (meta tag, headings, lang, canonical, link)
  └── 3. turndown → HTML → Markdown
  │
  └── Output: url, title, metaTitle, metaDescription, h1, headings,
              canonical, lang, markdown, wordCount, links, publishedAt
```

## Limitazioni

- Massimo 500 pagine per richiesta (illimitato con `maxPages: 0`)
- Timeout di 30 secondi per richiesta HTTP
- Solo siti web pubblicamente accessibili
- Non supporta contenuto generato dinamicamente da JavaScript (SPA, React, Vue)

## Tecnologie

| Libreria | Ruolo |
|----------|-------|
| **Express.js** | Framework web |
| **Axios** | Client HTTP |
| **Cheerio** | Parser HTML server-side |
| **Turndown** | Convertitore HTML → Markdown |
| **xml2js** | Parser XML per sitemap |
| **Commander.js** | Framework CLI |
| **TypeScript** | Linguaggio |

## Licenza

MIT
