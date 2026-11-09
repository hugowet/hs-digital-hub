export async function montinkRead(path: string, token: string | undefined) {
  if (!token) throw new Error("Autorização Montink não configurada.");
  const response = await fetch(`https://api.montink.com${path}`, { headers: { Authorizationtoken: token, Accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Consulta Montink recusada (HTTP ${response.status}).`);
  const body = await response.json() as any;
  if (body?.success !== true) throw new Error(body?.msg || "Montink não confirmou a consulta.");
  return body;
}

export async function montinkDescription(html: string) {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  document.querySelectorAll("script,style,iframe,object").forEach(node => node.remove());
  const blocks = [...document.querySelectorAll("p,li,h1,h2,h3")].filter(node => !node.parentElement?.closest("p,li"));
  return blocks.map(node => ({ text: node.textContent?.trim() ?? "", bold: Boolean(node.querySelector("strong,b")) && node.textContent?.trim() === node.querySelector("strong,b")?.textContent?.trim() })).filter(b => b.text);
}