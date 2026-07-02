#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient, SinglePageResult } from './client';
import { writeFile } from 'fs/promises';

dotenv.config();

const DEFAULT_API_URL = process.env.W2M_API_URL || 'http://localhost:3004';
const API_KEY = process.env.W2M_API_KEY || process.env.X_API_KEY || '';

function createClient(apiUrl?: string, apiKey?: string): ApiClient {
  const url = apiUrl || DEFAULT_API_URL;
  const key = apiKey || API_KEY;

  if (!key) {
    console.error('\n  ✖ Nessuna API key configurata.');
    console.error('    Imposta W2M_API_KEY o X_API_KEY come variabile d\'ambiente,');
    console.error('    o usa --api-key <chiave>.\n');
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

program.parse();
