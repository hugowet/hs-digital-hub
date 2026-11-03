import { parseHTML } from "linkedom";
import { extractExactAmazonPrice } from "./amazon-price";
import { extractAmazonAvailability, confirmedAmazonStock } from "./amazon-availability";
import { extractAmazonOptions, type AmazonOptionGroup } from "./amazon-options";

/** Confirm only the selected ASIN; sibling labels never inherit its price or inventory. */
export function extractSelectedAmazonOffer(html: string, asin?: string) {
  const availability = extractAmazonAvailability(html);
  const allOptions = extractAmazonOptions(html);
  const blocked = { availability, variations: allOptions, stock: 0 };
  if (!asin || extractExactAmazonPrice(html, asin) === null || availability !== "available") return blocked;
  if (!allOptions.length) return { availability, variations: allOptions, stock: 1 };
  const { document } = parseHTML(html);
  const selected: AmazonOptionGroup[] = [];
  for (const group of allOptions) {
    const candidates = new Set<string>();
    for (const row of Array.from(document.querySelectorAll('[id^="inline-twister-row-"], [id^="variation_"]'))) {
      for (const item of Array.from(row.querySelectorAll('li[data-asin], li[data-defaultasin]'))) {
        const identity = item.getAttribute("data-asin") ?? item.getAttribute("data-defaultasin");
        if (identity?.toUpperCase() !== asin.toUpperCase()) continue;
        if (item.getAttribute("data-initiallyselected") !== "true" && !item.querySelector('[aria-checked="true"], .a-button-selected')) continue;
        if (item.getAttribute("data-initiallyunavailable") === "true" || item.getAttribute("aria-disabled") === "true" || /unavailable/i.test(item.className)) continue;
        const label = (item.querySelector('.swatch-title-text-display, .swatch-title-text')?.textContent ?? item.querySelector('img')?.getAttribute('alt') ?? item.getAttribute('title') ?? '').replace(/\s+/g, ' ').trim();
        if (group.options.includes(label)) candidates.add(label);
      }
    }
    if (candidates.size !== 1) return blocked;
    selected.push({ ...group, options: [...candidates], availability: "confirmed", asin: asin.toUpperCase() });
  }
  return { availability, variations: selected, stock: confirmedSelectedAmazonStock(availability, selected) };
}

export function confirmedSelectedAmazonStock(availability: Parameters<typeof confirmedAmazonStock>[0], groups: Array<{ options?: string[]; availability?: string; asin?: string }>) {
  return confirmedAmazonStock(availability, groups.some(group => group.availability !== "confirmed" || group.options?.length !== 1 || !/^[A-Z0-9]{10}$/.test(group.asin ?? "")));
}