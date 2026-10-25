import { readFreeTranslation, splitTranslationText } from "./cj-free-translation";

export class FreeTranslationDeferred extends Error {
  constructor(public readonly retryAt: string, message: string) { super(message); }
}

export function nextTranslationDay() {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 5, 0, 0);
  return next.toISOString();
}

/** Public supplier text only. Never sends credentials/customer data or calls the AI gateway. */
export async function translateCjFreeText(db: any, source: string): Promise<string> {
  if (!source.trim()) return source;
  const translated: string[] = [];
  for (const chunk of splitTranslationText(source)) {
    const bytes = new TextEncoder().encode(`en|pt-BR|${chunk}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const id = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const cached = await db.from("cj_translation_cache").select("translated_text").eq("id", id).maybeSingle();
    if (cached.error) throw cached.error;
    if (cached.data) { translated.push(cached.data.translated_text); continue; }
    const reservation = await db.rpc("reserve_cj_free_translation", { _bytes: new TextEncoder().encode(chunk).length });
    if (reservation.error) throw reservation.error;
    if (!reservation.data) throw new FreeTranslationDeferred(nextTranslationDay(), "Limite diário preventivo da tradução gratuita atingido. Retomada automática amanhã, sem IA paga.");
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", chunk);
    url.searchParams.set("langpair", "en|pt-br");
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (response.status === 429) throw new FreeTranslationDeferred(nextTranslationDay(), "Cota do tradutor gratuito atingida; aguardando próximo dia.");
    if (!response.ok) throw new Error(`Tradutor gratuito indisponível (${response.status}); nenhuma IA paga foi utilizada.`);
    const payload = await response.json();
    if (payload?.quotaFinished || Number(payload?.responseStatus) === 429 || Number(payload?.responseStatus) === 403)
      throw new FreeTranslationDeferred(nextTranslationDay(), "Cota do tradutor gratuito atingida; aguardando próximo dia.");
    const text = readFreeTranslation(payload);
    const saved = await db.from("cj_translation_cache").upsert({ id, translated_text: text }, { onConflict: "id" });
    if (saved.error) throw saved.error;
    translated.push(text);
  }
  return translated.join(" ");
}