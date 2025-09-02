# Website to Markdown Converter

Un servizio API REST che converte interi siti web in contenuto markdown strutturato. Il sistema scopre automaticamente tutte le pagine di un sito attraverso sitemap e robots.txt, quindi le converte in formato markdown.

## Caratteristiche

- 🔍 **Scoperta automatica delle pagine** tramite sitemap.xml e robots.txt
- 📄 **Conversione in markdown** di tutte le pagine scoperte
- 🔐 **Autenticazione API** tramite x-api-key
- ⚡ **Elaborazione parallela** per prestazioni ottimali
- 🛡️ **Gestione errori robusta** con continuazione su fallimenti singoli
- 📊 **Statistiche dettagliate** su pagine convertite

## Installazione

1. Clona il repository
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Configura il file `.env`:
   ```env
   X_API_KEY=your-secret-api-key-here
   PORT=3000
   MAX_PAGES_PER_SITE=100
   REQUEST_TIMEOUT=30000
   ```
4. Compila il progetto:
   ```bash
   npm run build
   ```
5. Avvia il server:
   ```bash
   npm start
   ```

## Sviluppo

Per lo sviluppo con hot-reload:
```bash
npm run dev
```

## API Endpoints

### POST /api/convert

Converte un sito web in markdown.

**Headers richiesti:**
- `x-api-key`: La tua API key configurata
- `Content-Type`: application/json

**Body della richiesta:**
```json
{
  "url": "www.example.com",
  "maxPages": 50
}
```

**Parametri:**
- `url` (string, richiesto): L'URL del sito da convertire
- `maxPages` (number, opzionale): Numero massimo di pagine da convertire (default: 100, max: 500)

**Risposta di successo:**
```json
{
  "success": true,
  "domain": "example.com",
  "totalPages": 25,
  "pages": [
    {
      "url": "https://example.com/page1",
      "title": "Titolo della pagina",
      "markdown": "# Titolo\n\nContenuto in markdown...",
      "wordCount": 150
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/convert/status

Verifica lo stato del servizio.

**Risposta:**
```json
{
  "service": "Website to Markdown Converter",
  "status": "active",
  "version": "1.0.0",
  "endpoints": {
    "convert": "POST /api/convert",
    "status": "GET /api/convert/status"
  }
}
```

### GET /health

Health check endpoint (non richiede autenticazione).

## Esempi di utilizzo

### cURL

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"url": "example.com", "maxPages": 10}'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    url: 'example.com',
    maxPages: 10
  })
});

const result = await response.json();
console.log(result);
```

## Come funziona

1. **Estrazione del dominio**: Il sistema estrae il dominio principale dall'URL fornito
2. **Scoperta delle pagine**: 
   - Cerca e analizza `sitemap.xml` e varianti
   - Analizza `robots.txt` per sitemap aggiuntive
   - Fallback alla homepage se nessuna sitemap è trovata
3. **Conversione**: Ogni pagina viene scaricata e convertita in markdown
4. **Pulizia**: Rimuove elementi non necessari (nav, footer, ads, script)
5. **Strutturazione**: Restituisce contenuto strutturato con metadati

## Configurazione

### Variabili d'ambiente

- `X_API_KEY`: Chiave API per l'autenticazione
- `PORT`: Porta del server (default: 3000)
- `MAX_PAGES_PER_SITE`: Limite massimo di pagine per sito (default: 100)
- `REQUEST_TIMEOUT`: Timeout per le richieste HTTP in ms (default: 30000)

## Limitazioni

- Massimo 500 pagine per richiesta
- Timeout di 30 secondi per richiesta HTTP
- Solo siti web pubblicamente accessibili
- Non supporta contenuto generato dinamicamente da JavaScript

## Tecnologie utilizzate

- **TypeScript**: Linguaggio principale
- **Express.js**: Framework web
- **Axios**: Client HTTP
- **Cheerio**: Parser HTML server-side
- **Turndown**: Convertitore HTML to Markdown
- **xml2js**: Parser XML per sitemap

## Licenza

MIT