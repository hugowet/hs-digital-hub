/** Product-only HTML extraction shared by manual, trend and stock readers. */
function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/\s+/g, " ").trim();
}

export function extractDescription(doc: Document): string {
  const parts: string[] = [];
  const bullets = doc.querySelector("#feature-bullets, #feature-bullets_feature_div");
  for (const li of Array.from(bullets?.querySelectorAll("li") ?? [])) {
    const text = cleanText(li.textContent);
    if (text.length > 2 && !/certifique-se|verifique se/i.test(text)) parts.push(`• ${text}`);
  }
  for (const box of Array.from(doc.querySelectorAll("#productDescription, #aplus, #aplus_feature_div"))) {
    const paragraphs = Array.from(box.querySelectorAll("p, li, h3, h4"));
    const texts = paragraphs.length ? paragraphs.map(p => cleanText(p.textContent)) : [cleanText(box.textContent)];
    for (const text of texts) if (text.length > 2) parts.push(text);
  }
  return [...new Set(parts)].join("\n");
}

function addSpec(specs: Record<string, string>, key: string, value: string) {
  const k = cleanText(key).replace(/[:\s]+$/g, "");
  const v = cleanText(value);
  // External reviews/rankings are not HS purchase reviews or HS sales.
  if (/avaliaç|customer review|ranking|best sellers rank/i.test(k)) return;
  if (k && v && k.length < 160 && v.length < 2000 && !specs[k]) specs[k] = v;
}

export function extractSpecs(doc: Document): Record<string, string> {
  const specs: Record<string, string> = {};
  const roots = doc.querySelectorAll(
    '[id^="productDetails_"], .prodDetTable, #productOverview_feature_div, #productFactsDesktopExpander, #productFactsDesktop_feature_div, #technicalSpecifications_feature_div, #poExpander, #detailBullets_feature_div, #detailBulletsWrapper_feature_div',
  );
  for (const root of Array.from(roots)) {
    for (const row of Array.from(root.querySelectorAll("tr"))) {
      const cells = Array.from(row.querySelectorAll("th, td"));
      if (cells.length >= 2) addSpec(specs, cells[0].textContent ?? "", cells[1].textContent ?? "");
    }
    for (const row of Array.from(root.querySelectorAll(".product-facts-detail, .a-row"))) {
      const key = row.querySelector(".a-col-left, .a-span3, .a-span4");
      const value = row.querySelector(".a-col-right, .a-span9, .a-span8");
      if (key && value) addSpec(specs, key.textContent ?? "", value.textContent ?? "");
    }
    for (const li of Array.from(root.querySelectorAll("li"))) {
      const label = li.querySelector(".a-text-bold");
      if (!label) continue;
      const key = cleanText(label.textContent);
      addSpec(specs, key, cleanText(li.textContent).replace(key, "").replace(/^[:\s]+/, ""));
    }
  }
  return specs;
}

/** Complement partial HTML tables without overriding page facts or stringifying objects. */
export function complementAmazonSpecs(specs: Record<string, string>, extra: unknown) {
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    for (const [key, value] of Object.entries(extra)) {
      if (typeof value === "string" || typeof value === "number") addSpec(specs, key, String(value));
    }
  }
  return specs;
}