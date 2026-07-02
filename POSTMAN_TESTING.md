# Postman Testing Guide

Questa guida spiega come utilizzare la collection Postman per testare l'API Website2Markdown.

## File Inclusi

- `Website2Markdown.postman_collection.json` - Collection principale con tutti i test
- `Website2Markdown.postman_environment.json` - Environment LOCAL con variabili predefinite
- `Website2Markdown.postman_environment.prod.json` - Environment PROD con dominio pubblico

## Importazione in Postman

### 1. Importa la Collection
1. Apri Postman
2. Clicca su "Import" in alto a sinistra
3. Seleziona il file `Website2Markdown.postman_collection.json`
4. Clicca "Import"

### 2. Importa gli Environments
1. Clicca sull'icona dell'ingranaggio in alto a destra (Manage Environments)
2. Clicca "Import"
3. Seleziona il file `Website2Markdown.postman_environment.json` (LOCAL)
4. Seleziona il file `Website2Markdown.postman_environment.prod.json` (PROD)
5. Per test in locale, seleziona l'environment "Website2Markdown Local"
6. Per test in produzione, seleziona l'environment "Website2Markdown PROD"

## Configurazione

### Variabili Environment
Prima di eseguire i test, configura le seguenti variabili nell'environment appropriato:

- `base_url`: URL base del server
  - LOCAL: `http://localhost:3004`
  - PROD: `https://w2m.otomatik.it`
- `api_key`: La tua API key (impostala secondo l'ambiente)
- `test_url_1`: URL di test 1 (default: `example.com`)
- `test_url_2`: URL di test 2 (default: `https://httpbin.org`)
- `max_pages_default`: Numero default di pagine (default: `5`)
- `max_pages_limit`: Limite massimo pagine (default: `50`)

### Configurazione API Key
**IMPORTANTE**: Imposta `api_key` correttamente in base all'ambiente:

1. Vai in "Environments" → scegli LOCAL o PROD
2. Imposta `api_key` con la chiave corretta (ad es. dal tuo `.env` per LOCAL, o quella di produzione per PROD)
3. Salva le modifiche

## Test Disponibili

### 1. Health Check
- **Endpoint**: `GET /health`
- **Scopo**: Verifica che il server sia attivo
- **Test automatici**:
  - Status code 200
  - Response contiene `status: "OK"`
  - Response contiene timestamp

### 2. API Status
- **Endpoint**: `GET /api/convert/status`
- **Scopo**: Verifica lo stato del servizio di conversione
- **Richiede**: API Key
- **Test automatici**:
  - Status code 200
  - Service status "active"
  - Presenza informazioni endpoints

### 3. Convert Website - Example.com
- **Endpoint**: `POST /api/convert`
- **Scopo**: Test di conversione con example.com
- **Parametri**: `url: "example.com"`, `maxPages: 5`
- **Test automatici**:
  - Status code 200
  - Response success = true
  - Presenza domain, pages array
  - Validazione struttura pagine

### 4. Convert Website - Custom URL
- **Endpoint**: `POST /api/convert`
- **Scopo**: Test con URL personalizzato (httpbin.org)
- **Parametri**: `url: "https://httpbin.org"`, `maxPages: 3`

### 5. Test di Errore

#### Missing API Key
- **Scopo**: Verifica gestione mancanza API key
- **Atteso**: Status 401, messaggio errore

#### Invalid API Key
- **Scopo**: Verifica gestione API key non valida
- **Atteso**: Status 403, messaggio errore

#### Missing URL
- **Scopo**: Verifica validazione URL mancante
- **Atteso**: Status 400, messaggio errore

#### Invalid URL Format
- **Scopo**: Verifica validazione formato URL
- **Atteso**: Status 400, messaggio errore

#### Too Many Pages
- **Scopo**: Verifica limite maxPages
- **Parametri**: `maxPages: 1000`
- **Atteso**: Status 400, messaggio errore

## Esecuzione dei Test

### Test Singolo
1. Seleziona una richiesta dalla collection
2. Clicca "Send"
3. Verifica i risultati nella sezione "Test Results"

### Test di tutta la Collection
1. Clicca sui tre puntini accanto al nome della collection
2. Seleziona "Run collection"
3. Configura le opzioni di esecuzione
4. Clicca "Run Website to Markdown API"

### Test Automatici Globali
Ogni richiesta include test automatici per:
- Tempo di risposta < 30 secondi
- Response in formato JSON valido
- Logging delle richieste nella console

## Troubleshooting

### Server non raggiungibile
- Verifica che il server sia avviato (`npm run dev`)
- Controlla che `base_url` sia corretto
- Per LOCAL verifica che la porta 3004 sia libera

### Errori di autenticazione
- Verifica che `api_key` corrisponda al valore dell'ambiente scelto
- Controlla che l'header `x-api-key` sia presente

### Test falliti
- Controlla i log del server per errori dettagliati
- Verifica la connessione internet per i test di conversione
- Alcuni siti potrebbero bloccare le richieste automatiche

## Personalizzazione

### Aggiungere nuovi test
1. Duplica una richiesta esistente
2. Modifica URL, parametri e test
3. Aggiungi test specifici nella sezione "Tests"

### Modificare gli URL di test
- Modifica le variabili `test_url_1` e `test_url_2` nell'environment
- Oppure modifica direttamente i body delle richieste

### Test con siti reali
Per testare con siti web reali:
1. Sostituisci gli URL di esempio con siti reali
2. Considera che alcuni siti potrebbero avere protezioni anti-bot
3. Usa `maxPages` bassi per test rapidi

## Note Importanti

- I test di conversione richiedono connessione internet
- Alcuni siti web potrebbero bloccare richieste automatiche
- I tempi di risposta dipendono dalla velocità del sito target
- Usa sempre API key valide per evitare errori di autenticazione