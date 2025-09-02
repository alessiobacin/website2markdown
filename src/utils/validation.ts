/**
 * Valida se una stringa è un URL valido
 * @param url - L'URL da validare
 * @returns true se l'URL è valido, false altrimenti
 */
export const validateUrl = (url: string): boolean => {
  try {
    // Aggiungi http:// se non presente
    const urlToTest = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    const parsedUrl = new URL(urlToTest);
    
    // Verifica che abbia un hostname valido
    return parsedUrl.hostname.length > 0 && parsedUrl.hostname.includes('.');
  } catch {
    return false;
  }
};

/**
 * Estrae il dominio principale da un URL
 * @param url - L'URL da cui estrarre il dominio
 * @returns Il dominio principale
 */
export const extractDomain = (url: string): string => {
  try {
    const urlToProcess = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    const parsedUrl = new URL(urlToProcess);
    return parsedUrl.hostname;
  } catch {
    throw new Error('Invalid URL format');
  }
};

/**
 * Normalizza un URL aggiungendo il protocollo se mancante
 * @param url - L'URL da normalizzare
 * @returns L'URL normalizzato
 */
export const normalizeUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};