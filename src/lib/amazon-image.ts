/** Amazon serves resized thumbnails like `ID._AC_SX300_.jpg`; dropping the modifier returns the original full-resolution file. */
export function amazonFullResImage(url: string): string {
  if (!/^https:\/\/[a-z0-9.-]*media-amazon\.com\/images\//i.test(url)) return url;
  return url.replace(/\._[^/]*_\.(jpg|jpeg|png|webp)$/i, ".$1");
}

const IMG = String.raw`"(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"`;
function collectHiRes(chunk: string): string[] {
  const found: string[] = [];
  // One entry per photo: prefer "hiRes", use "large" only when hiRes is missing.
  for (const entry of chunk.split(/(?=\{\s*"hiRes"\s*:)/)) {
    const hi = entry.match(new RegExp(`"hiRes":${IMG}`)) ?? entry.match(new RegExp(`"large":${IMG}`));
    if (!hi) continue;
    const url = amazonFullResImage(hi[1]);
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
  // Amazon writes either `'initial': [...]` or `'initial': A.$.parseJSON('[...]')`.
  const initial = html.match(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:\s*(?:[\w.$]+\(\s*['"])?\[/);
  if (initial?.index !== undefined) {
    const arr = balancedArray(html, initial.index + initial[0].length - 1);
    const list = collectHiRes(arr);
    if (list.length) return list;
  }
  const main = html.match(/id="landingImage"[^>]*data-old-hires="(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"/)
    ?? html.match(/data-old-hires="(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"[^>]*id="landingImage"/);
  return main ? [amazonFullResImage(main[1])] : [];
}

const VIDEO_URL = /https:\\?\/\\?\/[a-z0-9.-]*(?:media-amazon\.com|ssl-images-amazon\.com)\\?\/[^"'\s<>]+?\.(?:mp4|m3u8)/gi;

/**
 * The listing's own videos ("videos": [...] in the image block). Related and
 * sponsored videos elsewhere on the page are ignored. MP4 files come first
 * because every browser plays them; HLS (.m3u8) is kept as a fallback.
 */
export function amazonVideosFromHtml(html: string): string[] {
  if (!html) return [];
  const chunks: string[] = [];
  const re = /['"]videos['"]\s*:\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && chunks.length < 3) {
    const arr = balancedArray(html, m.index + m[0].length - 1);
    if (arr.length > 2) chunks.push(arr);
  }
  const found: string[] = [];
  for (const chunk of chunks) {
    for (const raw of chunk.match(VIDEO_URL) ?? []) {
      const url = raw.replace(/\\\//g, "/");
      if (!found.includes(url)) found.push(url);
    }
    if (found.length) break; // first block = this product
  }
  return [...found.filter((u) => /\.mp4$/i.test(u)), ...found.filter((u) => /\.m3u8$/i.test(u))].slice(0, 3);
}
