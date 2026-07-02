# Website to Markdown Converter

Servizio API REST + CLI per convertire interi siti web in contenuto markdown strutturato. Scopre automaticamente tutte le pagine di un sito attraverso sitemap.xml, robots.txt e crawling della homepage, poi le converte in formato markdown.

## Caratteristiche

- **Scoperta automatica pagine** tramite sitemap.xml, robots.txt e crawling
- **Conversione in markdown** di pagine singole o interi siti
- **Modalità unlimited** — scarica TUTTE le pagine scoperte (maxPages: 0)
- **Crawling secondario** — segue link interni per scoprire più pagine
- **Crawling blog/archivi** — supporto paginazione per `/blog/`, `/news/`, ecc.
- **CLI nativa** (`w2m`) — interagisci con l'API da terminale
- **Autenticazione API** tramite `x-api-key`
- **Robustezza** — continua anche se pagine singole falliscono
- **Endpoint robots.txt dedicato** — scarica il robots.txt di qualsiasi sito

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

#### One-liner da GitHub

```bash
curl -sSL https://raw.githubusercontent.com/alessiobacin/website2markdown/main/scripts/install.sh | bash
```

Installa Node.js 18+, scarica il repo, compila e collega il comando globale `w2m`.

#### Installazione manuale

```bash
git clone https://github.com/alessiobacin/website2markdown.git
cd website2markdown
npm install
npm run build
npm link        # → w2m disponibile globalmente
```

#### Da npm registry (se pubblicato)

```bash
npm install -g website2markdown
```

#### Uso diretto senza installazione

```bash
npx github:alessiobacin/website2markdown w2m --help
```

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

La CLI legge le credenziali da variabili d'ambiente o parametri espliciti:

```bash
# Variabili d'ambiente (comode per uso frequente)
export W2M_API_URL=http://localhost:3004
export W2M_API_KEY=la-tua-chiave

# Oppure --api-key / --api-url su ogni comando
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

### w2m health

Health check rapido del server.

```bash
w2m health
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

Il flusso di conversione per `POST /api/convert`:

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
