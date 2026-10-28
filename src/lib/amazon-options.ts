import { parseHTML } from "linkedom";

export type AmazonOptionGroup = { name: string; options: string[]; availability: "unconfirmed"; source: "page" };

/** Extract actual page options; a swatch is NOT an inventory confirmation. */
export function extractAmazonOptions(html: string): AmazonOptionGroup[] {
  if (!html) return [];
  const { document } = parseHTML(html);
  const groups: AmazonOptionGroup[] = [];
  for (const [dimension, name] of [["size", "Tamanho"], ["color", "Cor"], ["style", "Modelo"]]) {
    const values = new Set<string>();
    const add = (raw: string | null | undefined) => {
      const value = (raw ?? "").replace(/^(clique para selecionar|click to select|tamanho|size|cor|color)\s*:?\s*/i, "").replace(/\s+/g, " ").trim();
      if (value && value.length <= 80 && !/^(selecione|select|escolha|choose)|indisponível|unavailable/i.test(value)) values.add(value);
    };
    const containers = document.querySelectorAll(`[id^="variation_${dimension}"], select[name="dropdown_selected_${dimension}_name"]`);
    for (const container of Array.from(containers)) {
      for (const option of Array.from(container.querySelectorAll("option, li[data-asin], li[data-defaultasin], li[data-csa-c-item-id]"))) {
        if (option.hasAttribute("disabled") || option.getAttribute("aria-disabled") === "true" || /unavailable|swatchUnavailable/.test(option.className)) continue;
        const image = option.querySelector("img");
        add(option.getAttribute("data-a-html-content")?.replace(/<[^>]*>/g, "") || image?.getAttribute("alt") || option.getAttribute("title") || option.textContent);
      }
      // Selected option can be the only exposed variant on simplified pages.
      add(container.querySelector(".selection")?.textContent);
    }
    if (values.size) groups.push({ name: name ?? dimension ?? "Opção", options: [...values], availability: "unconfirmed", source: "page" });
  }
  return groups;
}