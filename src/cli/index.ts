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
  .description('CLI per Website to Markdown Converter — converti siti web in markdown')
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

program.parse();
