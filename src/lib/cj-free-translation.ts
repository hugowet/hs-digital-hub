const encoder = new TextEncoder();

/** MyMemory accepts at most 500 UTF-8 bytes, not 500 characters. */
export function splitTranslationText(text: string, maxBytes = 450): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const character of text) {
    if (encoder.encode(current + character).length > maxBytes) {
      chunks.push(current);
      current = "";
    }
    current += character;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function readFreeTranslation(payload: unknown): string {
  const body = payload as { responseStatus?: number; quotaFinished?: boolean; responseData?: { translatedText?: unknown } } | null;
  if (body?.quotaFinished || Number(body?.responseStatus) !== 200)
    throw new Error("Tradução gratuita indisponível ou cota atingida; nenhuma IA paga foi utilizada.");
  const text = body?.responseData?.translatedText;
  if (typeof text !== "string" || !text.trim()) throw new Error("Tradução gratuita retornou conteúdo vazio.");
  return text.trim();
}