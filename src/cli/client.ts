import axios, { AxiosInstance, AxiosError } from 'axios';

export interface SinglePageResult {
  url: string;
  title: string;
  markdown: string;
  wordCount: number;
}

export interface ConvertResult {
  success: boolean;
  domain: string;
  totalPages: number;
  pages: SinglePageResult[];
  timestamp: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl.replace(/\/+$/, ''),
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
  }

  async convertWebsite(url: string, maxPages: number = 100): Promise<ConvertResult> {
    const response = await this.client.post('/api/convert', { url, maxPages });
    return response.data;
  }

  async convertSingle(url: string): Promise<{
    success: boolean;
    url: string;
    title: string;
    markdown: string;
    wordCount: number;
    timestamp: string;
  }> {
    const response = await this.client.post('/api/convert/single', { url });
    return response.data;
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/api/convert/status');
    return response.data;
  }

  async healthCheck(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async fetchRobotsTxt(url: string): Promise<{
    success: boolean;
    domain: string;
    sourceUrl: string;
    content: string;
  }> {
    const response = await this.client.get('/api/robots-txt', { params: { url } });
    return response.data;
  }

  formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      if (axiosError.response) {
        const msg = axiosError.response.data?.error || axiosError.response.data?.message || axiosError.message;
        return `Errore ${axiosError.response.status}: ${msg}`;
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return `Connessione rifiutata — il server è in esecuzione su ${this.client.defaults.baseURL}?`;
      }
      return `Errore di connessione: ${axiosError.message}`;
    }
    if (error instanceof Error) {
      return `Errore: ${error.message}`;
    }
    return `Errore sconosciuto: ${String(error)}`;
  }
}
