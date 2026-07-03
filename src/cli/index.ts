#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient, SinglePageResult } from './client';
import { writeFile } from 'fs/promises';
import { loadConfig, saveConfig, CliConfig } from './config';
import { execSync } from 'child_process';

dotenv.config();

const configFile = loadConfig();

function resolveApiUrl(flagUrl?: string): string {
  return flagUrl || process.env.W2M_API_URL || configFile.apiUrl || 'http://localhost:3004';
}

function resolveApiKey(flagKey?: string): string {
  return flagKey || process.env.W2M_API_KEY || process.env.X_API_KEY || configFile.apiKey || '';
}

function createClient(apiUrl?: string, apiKey?: string): ApiClient {
  const url = resolveApiUrl(apiUrl);
  const key = resolveApiKey(apiKey);

  if (!key) {
    console.error('\n  ✖ Nessuna API key configurata.');
    console.error('    Opzioni:');
    console.error('      1. w2m configure --api-url <url> --api-key <chiave>');
    console.error('      2. export W2M_API_KEY=<chiave>');
    console.error('      3. --api-key <chiave> su ogni comando\n');
    process.exit(1);
  }

  return new ApiClient(url, key);
}

const program = new Command();

program
  .name('w2m')
  .description('CLI per Website to Markdown Converter — converti siti, scopri URL, estrai contenuto strutturato, confronta pagine, cerca, chunk per LLM, mappa topic e analizza sitemap')
  .version('1.0.0')
  .option('-u, --api-url <url>', 'URL base del server API')
  .option('-k, --api-key <key>', 'API key per autenticazione');

program
  .command('configure')
  .description('Salva URL e API key in ~/.w2m/config.json (persistenti)')
  .option('-u, --api-url <url>', 'URL base del server API')
  .option('-k, --api-key <key>', 'API key per autenticazione')
  .action(async (options: { apiUrl?: string; apiKey?: string }) => {
    const url = options.apiUrl || program.opts().apiUrl;
    const key = options.apiKey || program.opts().apiKey;

    if (!url || !key) {
      console.error('\n  ✖ Devi specificare --api-url e --api-key.\n');
      console.error('    w2m configure --api-url https://example.com --api-key la-tua-chiave\n');
      process.exit(1);
    }

    saveConfig({ apiUrl: url, apiKey: key });
    console.log(`\n  ✔ Configurazione salvata in ~/.w2m/config.json\n`);
    console.log(`    URL:  ${url}`);
    console.log(`    Key:  ${key.slice(0, 8)}...\n`);
  });

program
  .command('convert')
  .description('Converte un intero sito web in markdown')
  .argument('<url>', 'URL del sito da convertire')
  .option('-m, --max-pages <number>', 'Numero massimo di pagine (default: 100, max: 500, 0 = illimitato)', parseInt)
  .option('-o, --output <directory>', 'Directory dove salvare i file .md (default: stdout)')
  .action(async (url: string, options: { maxPages?: number; output?: string }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);

    try {
      const result = await client.convertWebsite(url, options.maxPages ?? 100);

      console.log(`\n  ✔ Sito: ${result.domain}`);
      console.log(`  Pagine trovate: ${result.totalPages}\n`);

      if (options.output) {
        const dir = options.output;
        fs.mkdirSync(dir, { recursive: true });
        for (const page of result.pages) {
          const filename = page.url
            .replace(/^https?:\/\//, '')
            .replace(/[\/?#]/g, '_')
            .replace(/_+$/, '')
            + '.md';
          const filePath = path.join(dir, filename);
          await writeFile(filePath, page.markdown, 'utf-8');
        }
        console.log(`  Salvataggio: ${result.pages.length} file in "${dir}/"\n`);
      } else {
        for (const page of result.pages) {
          console.log(`  [${page.wordCount} w] ${page.title}`);
          console.log(`        ${page.url}\n`);
        }
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('single')
  .description('Converte una singola pagina web in markdown')
  .argument('<url>', 'URL della pagina da convertire')
  .option('-o, --output <file>', 'File dove salvare il markdown (default: stdout)')
  .action(async (url: string, options: { output?: string }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.convertSingle(url);

      if (options.output) {
        await writeFile(options.output, result.markdown, 'utf-8');
        console.log(`\n  ✔ Salvato in "${options.output}" (${result.wordCount} parole)\n`);
      } else {
        console.log(`\n  Titolo: ${result.title}`);
        console.log(`  URL:    ${result.url}`);
        console.log(`  Parole: ${result.wordCount}\n`);
        console.log('---\n');
        console.log(result.markdown);
        console.log('\n---\n');
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Mostra lo stato del servizio API')
  .action(async () => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const status = await client.getStatus();
      console.log(`\n  Servizio: ${status.service}`);
      console.log(`  Stato:    ${status.status}`);
      console.log(`  Versione: ${status.version}\n`);
      if (status.endpoints) {
        console.log('  Endpoint:');
        for (const [name, ep] of Object.entries(status.endpoints as Record<string, string>)) {
          console.log(`    ${name}: ${ep}`);
        }
        console.log();
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Health check del server')
  .action(async () => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const health = await client.healthCheck();
      console.log(`\n  Stato: ${health.status}`);
      console.log(`  Ora:   ${health.timestamp}\n`);
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('robots')
  .description('Scarica il robots.txt di un sito web')
  .argument('<url>', 'URL del sito')
  .option('-o, --output <file>', 'File dove salvare il contenuto (default: stdout)')
  .action(async (url: string, options: { output?: string }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.fetchRobotsTxt(url);

      if (options.output) {
        await writeFile(options.output, result.content, 'utf-8');
        console.log(`\n  ✔ Robots.txt salvato in "${options.output}"\n`);
      } else {
        console.log(`\n  URL origine: ${result.sourceUrl}\n`);
        console.log(result.content);
        console.log();
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Aggiorna w2m all\'ultima versione da GitHub')
  .action(async () => {
    const packageRoot = path.resolve(__dirname, '..', '..');
    const pkgJson = path.join(packageRoot, 'package.json');
    const gitDir = path.join(packageRoot, '.git');

    if (!fs.existsSync(pkgJson)) {
      console.error('\n  ✖ Installazione non trovata.\n');
      process.exit(1);
    }

    // Leggi versione corrente
    const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
    console.log(`\n  Versione installata: ${pkg.version}\n`);

    if (fs.existsSync(gitDir)) {
      // Installazione da git → pull + rebuild
      console.log('  Controllo aggiornamenti...\n');

      try {
        execSync('git fetch origin main', { cwd: packageRoot, stdio: 'pipe' });
        const behind = execSync('git rev-list --count HEAD..origin/main', { cwd: packageRoot, stdio: 'pipe' })
          .toString().trim();

        if (behind === '0') {
          console.log('  ✔ Già all\'ultima versione.\n');
          return;
        }

        console.log(`  Nuovi commit: ${behind}\n`);

        execSync('git pull --ff-only origin main', { cwd: packageRoot, stdio: 'inherit' });
        console.log('  Installa dipendenze...');
        execSync('npm install --silent', { cwd: packageRoot, stdio: 'inherit' });
        console.log('  Compila...');
        execSync('npm run build', { cwd: packageRoot, stdio: 'inherit' });

        console.log(`\n  ✔ w2m aggiornato alla versione ${pkg.version}.\n`);
      } catch (err) {
        console.error('\n  ✖ Aggiornamento fallito.');
        console.error('    Riprova manualmente: cd ~/.w2m && git pull && npm install && npm run build\n');
        process.exit(1);
      }
    } else {
      // Installazione npm globale → reinstall
      console.log('  Reinstallazione da GitHub...\n');

      try {
        execSync('npm install -g github:alessiobacin/website2markdown', { stdio: 'inherit' });
        console.log(`\n  ✔ w2m aggiornato.\n`);
      } catch {
        console.error('\n  ✖ Reinstallazione fallita.');
        console.error('    Riprova: npm install -g github:alessiobacin/website2markdown\n');
        process.exit(1);
      }
    }
  });

// ── Nuovi comandi ─────────────────────────────────

program
  .command('discover')
  .description('Scopre URL di un sito web senza convertirli')
  .argument('<url>', 'URL del sito')
  .option('-m, --max-pages <number>', 'Numero massimo di URL (default: 100, 0 = unlimited)', parseInt)
  .option('--json', 'Output in formato JSON')
  .action(async (url: string, options: { maxPages?: number; json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.discover(url, options.maxPages ?? 100);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`\n  ✔ Dominio: ${result.domain}`);
      console.log(`  URL trovati: ${result.totalUrls}\n`);
      for (const u of result.urls) {
        const badge = u.source === 'sitemap' ? '🗺️' : u.source === 'robots' ? '🤖' : '🕷️';
        console.log(`  ${badge} [${u.source}] ${u.url}`);
      }
      console.log();
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('extract')
  .description('Estrae contenuto strutturato di una singola pagina')
  .argument('<url>', 'URL della pagina')
  .option('-o, --output <file>', 'File JSON dove salvare l\'estrazione')
  .option('--md', 'Mostra anche il markdown')
  .action(async (url: string, options: { output?: string; md?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.extract(url);

      if (options.output) {
        await writeFile(options.output, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`\n  ✔ Estratto salvato in "${options.output}"\n`);
        return;
      }

      console.log(`\n  Titolo:       ${result.title}`);
      console.log(`  Meta Title:   ${result.metaTitle}`);
      console.log(`  Meta Desc:    ${result.metaDescription.slice(0, 120)}${result.metaDescription.length > 120 ? '…' : ''}`);
      console.log(`  H1:           ${result.h1.join(' | ')}`);
      console.log(`  Headings:     ${result.headings.length}`);
      console.log(`  Canonical:    ${result.canonical || '—'}`);
      console.log(`  Lingua:       ${result.lang || '—'}`);
      console.log(`  Parole:       ${result.wordCount}`);
      console.log(`  Link interni: ${result.linksInternalCount}`);
      console.log(`  Link esterni: ${result.linksExternalCount}`);
      console.log(`  Pubblicato:   ${result.publishedAt || '—'}\n`);

      console.log('  Heading struttura:');
      for (const h of result.headings.slice(0, 20)) {
        const indent = '  '.repeat(h.level - 1);
        console.log(`    ${indent}${'#'.repeat(h.level)} ${h.text}`);
      }
      if (result.headings.length > 20) {
        console.log(`    … e altri ${result.headings.length - 20} heading`);
      }

      if (options.md) {
        console.log('\n---\n');
        console.log(result.markdown);
        console.log('\n---\n');
      }
      console.log();
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Confronta due pagine o blocchi markdown')
  .option('-u1, --url1 <url>', 'Primo URL')
  .option('-u2, --url2 <url>', 'Secondo URL')
  .option('-m1, --markdown1 <file>', 'File markdown 1')
  .option('-m2, --markdown2 <file>', 'File markdown 2')
  .option('--json', 'Output in formato JSON')
  .action(async (options: { url1?: string; url2?: string; markdown1?: string; markdown2?: string; json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);

    let md1: string | undefined;
    let md2: string | undefined;

    if (options.markdown1) md1 = fs.readFileSync(options.markdown1, 'utf-8');
    if (options.markdown2) md2 = fs.readFileSync(options.markdown2, 'utf-8');

    try {
      const result = await client.diff({
        url1: options.url1,
        url2: options.url2,
        markdown1: md1,
        markdown2: md2,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n  📊 Confronto`);
      console.log(`  Sorgente 1: ${result.source1}`);
      console.log(`  Sorgente 2: ${result.source2}\n`);

      console.log(`  Statistiche:`);
      console.log(`    Parole:      ${result.stats.wordCount1} vs ${result.stats.wordCount2}`);
      console.log(`    Heading:     ${result.stats.headingCount1} vs ${result.stats.headingCount2}`);
      console.log(`    Similarità:  ${result.stats.similarityPercent}%\n`);

      if (result.differences.headingsMissingInSource2.length > 0) {
        console.log(`  ⚠️  Heading presenti in 1 ma mancanti in 2:`);
        for (const h of result.differences.headingsMissingInSource2) {
          console.log(`    ${'#'.repeat(h.level)} ${h.text}`);
        }
        console.log();
      }

      if (result.differences.headingsMissingInSource1.length > 0) {
        console.log(`  ⚠️  Heading presenti in 2 ma mancanti in 1:`);
        for (const h of result.differences.headingsMissingInSource1) {
          console.log(`    ${'#'.repeat(h.level)} ${h.text}`);
        }
        console.log();
      }

      if (result.topics.common.length > 0) {
        console.log(`  🟢 Topic comuni: ${result.topics.common.slice(0, 10).join(', ')}`);
      }
      if (result.topics.uniqueToSource1.length > 0) {
        console.log(`  🔵 Unici in 1: ${result.topics.uniqueToSource1.slice(0, 10).join(', ')}`);
      }
      if (result.topics.uniqueToSource2.length > 0) {
        console.log(`  🟠 Unici in 2: ${result.topics.uniqueToSource2.slice(0, 10).join(', ')}`);
      }
      console.log();
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Cerca testo in pagine convertite')
  .argument('<query>', 'Testo da cercare')
  .option('-d, --dir <directory>', 'Directory con file .md da cercare')
  .option('-u, --url <url>', 'URL da cui scoprire e cercare pagine')
  .option('-i, --case-insensitive', 'Ricerca case-insensitive (default)')
  .option('--json', 'Output in formato JSON')
  .action(async (query: string, options: { dir?: string; url?: string; caseInsensitive?: boolean; json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      let pages: { url: string; markdown: string; title?: string }[] = [];

      if (options.dir) {
        // Cerca file .md in una directory
        const files = fs.readdirSync(options.dir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(options.dir!, file), 'utf-8');
          pages.push({ url: file, markdown: content, title: file.replace('.md', '') });
        }
      } else if (options.url) {
        // Scopri + converti pagine
        const discovered = await client.discover(options.url, 50);
        const batchResult = await client.batchSingle(discovered.urls.map(u => u.url), 3);
        pages = batchResult.results
          .filter(r => r.success && r.markdown)
          .map(r => ({ url: r.url, markdown: r.markdown!, title: r.title }));
      } else {
        console.error('\n  ✖ Specifica --dir o --url per cercare.\n');
        process.exit(1);
      }

      const result = await client.search({
        query,
        pages,
        caseSensitive: !options.caseInsensitive,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n  🔍 Ricerca: "${result.query}"`);
      console.log(`  Risultati: ${result.totalResults} pagine, ${result.totalMatches} match\n`);

      for (const r of result.results.slice(0, 10)) {
        console.log(`  📄 ${r.title || r.url} (${r.matches} match)`);
        for (const s of r.contextSnippets.slice(0, 3)) {
          console.log(`     ${s.slice(0, 150)}`);
        }
        console.log();
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('chunk')
  .description('Divide markdown in blocchi per LLM')
  .argument('<source>', 'URL della pagina o file .md')
  .option('-t, --max-tokens <number>', 'Token massimi per chunk (default: 500)', parseInt)
  .option('-o, --overlap <number>', 'Token di overlap (default: 50)', parseInt)
  .option('--json', 'Output in formato JSON')
  .action(async (source: string, options: { maxTokens?: number; overlap?: number; json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      let result;

      if (source.startsWith('http://') || source.startsWith('https://')) {
        result = await client.chunk({ url: source, maxTokens: options.maxTokens ?? 500, overlap: options.overlap ?? 50 });
      } else {
        const md = fs.readFileSync(source, 'utf-8');
        result = await client.chunk({ markdown: md, maxTokens: options.maxTokens ?? 500, overlap: options.overlap ?? 50 });
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n  🧩 ${result.totalChunks} chunk generati (max ${result.maxTokens} token, overlap ${result.overlap})\n`);
      for (const chunk of result.chunks) {
        const headingPath = chunk.headingPath.length > 0 ? chunk.headingPath.join(' > ') : '(root)';
        console.log(`  [${chunk.index}] ~${chunk.tokenEstimate} token, ~${chunk.wordEstimate} parole`);
        console.log(`      Path: ${headingPath}`);
        console.log(`      Testo: ${chunk.text.slice(0, 100)}…\n`);
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('map-topics')
  .description('Mappa i topic di un sito web')
  .argument('<url>', 'URL del sito')
  .option('-m, --min-frequency <number>', 'Frequenza minima parola (default: 2)', parseInt)
  .option('--json', 'Output in formato JSON')
  .action(async (url: string, options: { minFrequency?: number; json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.mapTopics({ url, minWordFrequency: options.minFrequency ?? 2 });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n  🗺️  Topic Map per ${url}`);
      console.log(`  Pagine analizzate: ${result.totalPages}`);
      console.log(`  Topic trovati:     ${result.totalTopics}\n`);

      console.log('  Cluster principali:');
      for (const cluster of result.clusters.slice(0, 10)) {
        console.log(`\n  📌 ${cluster.topic} (${cluster.pages.length} pagine)`);
        if (cluster.relatedTopics.length > 0) {
          console.log(`     Correlati: ${cluster.relatedTopics.slice(0, 5).join(', ')}`);
        }
        for (const p of cluster.pages.slice(0, 3)) {
          console.log(`     └ ${p.title || p.url}`);
        }
      }

      if (result.suggestedGaps.length > 0) {
        console.log('\n  💡 Gap suggeriti:');
        for (const gap of result.suggestedGaps) {
          console.log(`     • ${gap}`);
        }
      }
      console.log();
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Converte una lista specifica di URL')
  .argument('<urls...>', 'URL da convertire')
  .option('-c, --concurrency <number>', 'Concorrenza (default: 3)', parseInt)
  .option('-o, --output <directory>', 'Directory dove salvare i file .md')
  .action(async (urls: string[], options: { concurrency?: number; output?: string }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.batchSingle(urls, options.concurrency ?? 3);

      console.log(`\n  ✔ Batch completato:`);
      console.log(`  Totali:  ${result.total}`);
      console.log(`  Ok:      ${result.successCount}`);
      console.log(`  Falliti: ${result.failedCount}\n`);

      if (options.output) {
        const dir = options.output;
        fs.mkdirSync(dir, { recursive: true });
        for (const r of result.results.filter(r => r.success && r.markdown)) {
          const filename = r.url.replace(/^https?:\/\//, '').replace(/[\/?#]/g, '_').replace(/_+$/, '') + '.md';
          await writeFile(path.join(dir, filename), r.markdown!, 'utf-8');
        }
        console.log(`  Salvati in "${dir}/"\n`);
      } else {
        for (const r of result.results) {
          const icon = r.success ? '✔' : '✖';
          console.log(`  ${icon} ${r.url}${r.success ? ` (${r.wordCount} parole)` : ` — ${r.error}`}`);
        }
        console.log();
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program
  .command('sitemap')
  .description('Analizza la sitemap di un sito')
  .argument('<url>', 'URL del sito')
  .option('--json', 'Output in formato JSON')
  .action(async (url: string, options: { json?: boolean }) => {
    const client = createClient(program.opts().apiUrl, program.opts().apiKey);
    try {
      const result = await client.fetchSitemap(url);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (!result.found) {
        console.log(`\n  ℹ️  Nessuna sitemap trovata per ${url}\n`);
        return;
      }

      console.log(`\n  🗺️  Sitemap: ${result.sitemapUrl}`);
      console.log(`  Tipo:    ${result.type}`);
      console.log(`  URL:     ${result.totalUrls}\n`);

      if (result.children && result.children.length > 0) {
        console.log('  Sotto-sitemap:');
        for (const child of result.children) {
          console.log(`    📄 ${child.url} (${child.totalUrls} URL)`);
        }
        console.log();
      }

      if (result.urls && result.urls.length > 0) {
        console.log(`  Primi ${Math.min(result.urls.length, 20)} URL:`);
        for (const entry of result.urls.slice(0, 20)) {
          const date = entry.lastmod ? ` [${entry.lastmod}]` : '';
          console.log(`    ${entry.loc}${date}`);
        }
        if (result.urls.length > 20) {
          console.log(`    … e altri ${result.urls.length - 20} URL`);
        }
        console.log();
      }
    } catch (error: unknown) {
      console.error(`\n  ✖ ${client.formatError(error)}\n`);
      process.exit(1);
    }
  });

program.parse();
