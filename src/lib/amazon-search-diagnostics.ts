export type AmazonSearchPageDiagnostic = {
  keyword: string;
  page: number;
  url: string;
  outcome: "ok" | "failed" | "invalid_response" | "empty";
  reason: string;
  code?: string;
  httpStatus?: number;
  retryAt?: number;
  extracted: number;
  accepted: number;
  duplicates: number;
  rejections: Record<string, number>;
};

/** Only controlled messages are stored: never upstream bodies, headers or credentials. */
export class AmazonSearchReadError extends Error {
  constructor(public code: string, message: string, public httpStatus?: number, public retryAt?: number) {
    super(message);
    this.name = "AmazonSearchReadError";
  }
}

export function describeAmazonSearchError(error: unknown) {
  if (error instanceof AmazonSearchReadError) {
    return { code: error.code, reason: error.message, ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }), ...(error.retryAt === undefined ? {} : { retryAt: error.retryAt }) };
  }
  const name = error instanceof Error ? error.name : "UnknownError";
  if (name === "AbortError" || name === "TimeoutError") {
    return { code: "timeout", reason: "Tempo limite de leitura excedido." };
  }
  return { code: name === "TypeError" ? "network_error" : "unexpected_error", reason: name === "TypeError" ? "Falha de conexão durante a leitura da página." : "Falha inesperada durante a busca; causa não disponibilizada com segurança." };
}

export function amazonHttpError(status: number) {
  const reasons: Record<number, string> = {
    401: "Serviço de leitura recusou a autenticação.",
    402: "Serviço de leitura recusou a requisição por cobrança ou créditos.",
    403: "Serviço de leitura negou acesso; bloqueio pela Amazon não confirmado.",
    429: "Serviço de leitura atingiu o limite de requisições.",
    503: "Serviço de leitura indisponível; bloqueio pela Amazon não confirmado.",
    504: "Serviço de leitura excedeu o tempo de resposta.",
  };
  return new AmazonSearchReadError("reader_http_error", reasons[status] ?? `Serviço de leitura retornou HTTP ${status}.`, status);
}

/** Classify only known billing signals; never persist arbitrary provider bodies. */
export async function amazonReaderHttpError(response: Response, now = Date.now()) {
  const error = amazonHttpError(response.status);
  const payload = await response.json().catch(() => null);
  const message = typeof payload?.message === 'string' ? payload.message : typeof payload?.error === 'string' ? payload.error : '';
  if (response.status === 403 && message === 'Credit limit reached') {
    error.code = 'reader_credit_limit';
    error.message = 'Limite de créditos da conexão atingido; conferir o limite do workspace.';
  } else if (response.status === 402) {
    error.code = 'reader_credits_exhausted';
    error.message = payload?.type === 'payment_required' || message === 'Not enough credits'
      ? 'Créditos do workspace insuficientes para o leitor.'
      : 'Leitor recusou a consulta por saldo ou cobrança; verificar a conexão.';
  }
  const retry = response.headers.get('Retry-After');
  const seconds = retry && /^\d+(?:\.\d+)?$/.test(retry.trim()) ? Number(retry) : NaN;
  const retryDate = retry ? Date.parse(retry) : NaN;
  const supplied = Number.isFinite(seconds) ? now + seconds * 1000 : retryDate;
  const fallback = [401, 402, 403].includes(response.status) ? 3600000 : 300000;
  error.retryAt = Math.max(now + fallback, Number.isFinite(supplied) ? supplied : 0);
  return error;
}