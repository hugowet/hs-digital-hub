/** Amazon serves resized thumbnails like `ID._AC_SX300_.jpg`; dropping the modifier returns the original full-resolution file. */
export function amazonFullResImage(url: string): string {
  if (!/^https:\/\/[a-z0-9.-]*media-amazon\.com\/images\//i.test(url)) return url;
  return url.replace(/\._[^/]*_\.(jpg|jpeg|png|webp)$/i, ".$1");
}

function collectHiRes(chunk: string): string[] {
  const found: string[] = [];
  for (const match of chunk.matchAll(/"(?:hiRes|large)":"(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"/g)) {
    const url = amazonFullResImage(match[1]);
    if (!found.includes(url)) found.push(url);
  }
  return found;
}

/** Returns the bracket-balanced array that starts at `from` (index of "["). */
function balancedArray(html: string, from: number): string {
  let depth = 0;
  for (let i = from; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]" && --depth === 0) return html.slice(from, i + 1);
  }
  return "";
}

/**
 * Only the listing's own gallery ("colorImages" → "initial"). The rest of the page
 * carries other colours, other models and sponsored products, which must never
 * become this product's photos. Falls back to the single main image.
 */
export function amazonHiResFromHtml(html: string): string[] {
  const initial = html.match(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:\s*\[/);
  if (initial?.index !== undefined) {
    const arr = balancedArray(html, initial.index + initial[0].length - 1);
    const list = collectHiRes(arr);
    if (list.length) return list;
  }
  const main = html.match(/id="landingImage"[^>]*data-old-hires="(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"/)
    ?? html.match(/data-old-hires="(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"[^>]*id="landingImage"/);
  return main ? [amazonFullResImage(main[1])] : [];
}
