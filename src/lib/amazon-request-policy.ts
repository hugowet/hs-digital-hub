import { AmazonSearchReadError } from './amazon-search-diagnostics';

// Compatibility profiles, not a guarantee of access or a way to solve CAPTCHAs.
export const AMAZON_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
] as const;

export function amazonNavigationHeaders(random = Math.random) {
  return {
    'User-Agent': AMAZON_USER_AGENTS[Math.min(AMAZON_USER_AGENTS.length - 1, Math.floor(random() * AMAZON_USER_AGENTS.length))],
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    Referer: 'https://google.com.br',
  };
}

export function amazonNextAllowedAt(now = Date.now(), random = Math.random) {
  return now + 5000 + Math.min(7000, Math.floor(random() * 7001));
}

export function assertAmazonPageReadable(payload: { rawHtml?: unknown; html?: unknown; metadata?: { statusCode?: unknown; title?: unknown } }) {
  const html = String(payload.rawHtml ?? payload.html ?? '');
  const status = Number(payload.metadata?.statusCode);
  if (/\/errors\/validateCaptcha|id\s*=\s*["']captchacharacters|enter the characters you see below|digite os caracteres que você vê/i.test(html)) {
    throw new AmazonSearchReadError('amazon_captcha', 'Amazon retornou uma verificação CAPTCHA; rodada interrompida.');
  }
  // images-amazon.com alone is also used by legitimate product galleries.
  if (/dogs of amazon|sorry.{0,40}(something went wrong|we couldn.t find)|desculpe.{0,60}(algo deu errado|página não encontrada)/is.test(html + String(payload.metadata?.title ?? '')) || /images-amazon\.com\/images\/G\/[^"'\s]*\/(?:error|dogs?)\//i.test(html)) {
    throw new AmazonSearchReadError('amazon_error_page', 'Amazon retornou uma página de erro (Dogs); rodada interrompida.', Number.isFinite(status) && status > 0 ? status : undefined);
  }
  if ([403, 429, 503].includes(status)) throw new AmazonSearchReadError('amazon_access_denied', `Página Amazon retornou HTTP ${status}; rodada interrompida sem tentar contornar a recusa.`, status);
}

export function isAmazonRoundStop(error: unknown) {
  return error instanceof AmazonSearchReadError && ['amazon_captcha', 'amazon_error_page', 'amazon_access_denied'].includes(error.code);
}