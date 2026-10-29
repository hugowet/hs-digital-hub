export type AmazonSearchPageDiagnostic = {
  keyword: string;
  page: number;
  url: string;
  outcome: "ok" | "failed" | "invalid_response" | "empty";
  reason: string;
  code?: string;
  httpStatus?: number;
  extracted: number;
  accepted: number;
  duplicates: number;
  rejections: Record<string, number>;
};

/** Only controlled messages are stored: never upstream bodies, headers or credentials. */
export class AmazonSearchReadError extends Error {
  constructor(public code: string, message: string, public httpStatus?: number) {
    super(message);
    this.name = "AmazonSearchReadError";
  }
}

export function describeAmazonSearchError(error: unknown) {
  if (error instanceof AmazonSearchReadError) {
    return { code: error.code, reason: error.message, ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }) };
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