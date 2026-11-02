import { parseHTML } from "linkedom";

export type AmazonOptionGroup = { name: string; options: string[]; availability: "unconfirmed"; source: "page" };

const order = (name: string) => { const i = ["Cor", "Tamanho", "Armazenamento", "Modelo"].indexOf(name); return i < 0 ? 9 : i; };

/** Replace saved options when the page exposes more real choices (e.g. only one color saved). */
export function shouldReplaceOptions(saved: unknown, fresh: AmazonOptionGroup[]) {
  if (!fresh.length) return false;
  const count = (g: unknown) => Array.isArray(g) ? g.reduce((n, x: any) => n + (Array.isArray(x?.options) ? x.options.length : 0), 0) : 0;
  const broken = Array.isArray(saved) && saved.some((g: any) => g?.options?.some((o: string) => /^(B0[A-Z0-9]{8}|indexInDimList|defaultAsin|\/dp\/)/.test(o)));
  return broken || count(fresh) > count(saved);
}

/** Extract actual page options; a swatch is NOT an inventory confirmation. */
export function extractAmazonOptions(html: string): AmazonOptionGroup[] {
  if (!html) return [];
  const { document } = parseHTML(html);
  const groups: AmazonOptionGroup[] = [];
  // Twister moderno: "variationValues" é a fonte mais limpa de tamanhos/cores/capacidade etc.
  const vv = html.match(/"variationValues"\s*:\s*(\{[^{}]*\})/);
  if (vv) {
    try {
      const parsed = JSON.parse(vv[1]) as Record<string, unknown>;
      const labels: Record<string, string> = {
        color_name: "Cor", size_name: "Tamanho", style_name: "Modelo", pattern_name: "Estampa",
        flavor_name: "Sabor", scent_name: "Fragrância", material_type: "Material", configuration: "Configuração",
        item_package_quantity: "Quantidade por pacote", memory_storage_capacity: "Armazenamento",
        number_of_items: "Quantidade de itens", edition: "Edição", platform_for_display: "Plataforma",
      };
      for (const [key, value] of Object.entries(parsed)) {
        const list = Array.isArray(value) ? value.map((v) => String(v).trim()).filter((v) => v && v.length <= 80 && !/^selecione$/i.test(v)) : [];
        const label = labels[key] ?? key.replace(/_name$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
        if (list.length) groups.push({ name: label, options: [...new Set(list)], availability: "unconfirmed", source: "page" });
      }
      groups.sort((a, b) => order(a.name) - order(b.name));
      if (groups.length) return groups;
    } catch { /* cai para leitura da página */ }
  }
  // Twister antigo/alternativo: "dimensionsDisplay" + "dimensionValuesDisplayData" (ASIN -> valores).
  const dims = html.match(/"dimensionsDisplay"\s*:\s*(\[[^\]]*\])/);
  const dvd = html.match(/"dimensionValuesDisplayData"\s*:\s*(\{[^{}]*\})/);
  if (dims && dvd) {
    try {
      const names = (JSON.parse(dims[1]) as unknown[]).map((n) => String(n).trim());
      const rows = Object.values(JSON.parse(dvd[1]) as Record<string, unknown>).filter(Array.isArray) as unknown[][];
      names.forEach((raw, i) => {
        const values = [...new Set(rows.map((r) => String(r[i] ?? "").trim()).filter((v) => v && v.length <= 80))];
        const name = /tamanho|size|numera/i.test(raw) ? "Tamanho" : /cor|color/i.test(raw) ? "Cor" : raw;
        if (values.length) groups.push({ name, options: values, availability: "unconfirmed", source: "page" });
      });
      groups.sort((a, b) => order(a.name) - order(b.name));
      if (groups.length) return groups;
    } catch { /* segue */ }
  }
  // Inline twister (páginas de moda atuais): linhas "inline-twister-row-<dim>_name".
  for (const [dimension, name] of [["size", "Tamanho"], ["color", "Cor"], ["style", "Modelo"]] as const) {
    const row = document.querySelector(`[id^="inline-twister-row-${dimension}_name"], [id^="inline-twister-expander-content-${dimension}_name"]`);
    if (!row) continue;
    const values = new Set<string>();
    for (const el of Array.from(row.querySelectorAll("li"))) {
      if (/unavailable/i.test(el.className) || el.getAttribute("aria-disabled") === "true") continue;
      const text = (el.querySelector(".swatch-title-text-display, .swatch-title-text, img")?.getAttribute("alt")
        || el.querySelector(".swatch-title-text-display, .swatch-title-text")?.textContent
        || el.querySelector("img")?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
      if (text && text.length <= 80 && !/^(selecione|select)/i.test(text)) values.add(text);
    }
    if (values.size) groups.push({ name, options: [...values], availability: "unconfirmed", source: "page" });
  }
  if (groups.length) { groups.sort((a, b) => order(a.name) - order(b.name)); return groups; }
  for (const [dimension, name] of [["size", "Tamanho"], ["color", "Cor"], ["style", "Modelo"]]) {
    const values = new Set<string>();
    const add = (raw: string | null | undefined) => {
      const value = (raw ?? "").replace(/^(clique para selecionar|click to select|tamanho|size|cor|color)\s*:?\s*/i, "").replace(/\s+/g, " ").trim();
      if (value && value.length <= 80 && !/^(selecione|select|escolha|choose)|indisponível|unavailable/i.test(value)) values.add(value);
    };
    const containers = document.querySelectorAll(`div[id^="variation_${dimension}"], ul[id^="variation_${dimension}"], select[name="dropdown_selected_${dimension}_name"]`);
    for (const container of Array.from(containers)) {
      for (const option of Array.from(container.querySelectorAll("option, li[data-asin], li[data-defaultasin], li[data-csa-c-item-id]"))) {
        if (option.hasAttribute("disabled") || option.getAttribute("aria-disabled") === "true" || /unavailable|swatchUnavailable/.test(option.className)) continue;
        const image = option.querySelector("img");
        add(option.getAttribute("data-a-html-content")?.replace(/<[^>]*>/g, "") || image?.getAttribute("alt") || option.getAttribute("title") || option.textContent);
      }
      // Selected option can be the only exposed variant on simplified pages.
      add(container.querySelector(".selection")?.textContent);
    }
    if (!values.size) {
      // Twister moderno: opções vêm no JSON "variationValues" do script da página.
      const match = html.match(new RegExp(`"${dimension}_name"\\s*:\\s*\\[([^\\]]*)\\]`));
      if (match?.[1]) {
        for (const raw of match[1].match(/"((?:[^"\\]|\\.)*)"/g) ?? []) add(raw.slice(1, -1).replace(/\\"/g, '"'));
      }
    }
    if (values.size) groups.push({ name: name ?? dimension ?? "Opção", options: [...values], availability: "unconfirmed", source: "page" });
  }
  return groups;
}