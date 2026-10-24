export async function allPublicProductIds(
  readPage: (offset: number, limit: number) => Promise<string[]>,
  pageSize = 1000,
) {
  const ids: string[] = [];
  for (let offset = 0; ; ) {
    const page = await readPage(offset, pageSize);
    if (!page.length) return ids;
    ids.push(...page);
    offset += page.length;
  }
}