/** Amazon serves resized thumbnails like `ID._AC_SX300_.jpg`; dropping the modifier returns the original full-resolution file. */
export function amazonFullResImage(url: string): string {
  if (!/^https:\/\/[a-z0-9.-]*media-amazon\.com\/images\//i.test(url)) return url;
  return url.replace(/\._[^/]*_\.(jpg|jpeg|png|webp)$/i, ".$1");
}

/** Pulls the high-resolution gallery Amazon embeds in the page scripts ("hiRes"/"large"). */
export function amazonHiResFromHtml(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/"(?:hiRes|large)":"(https:\/\/[^"]+media-amazon\.com\/images\/I\/[^"]+)"/g)) {
    const url = amazonFullResImage(match[1]);
    if (!found.includes(url)) found.push(url);
  }
  return found;
}
