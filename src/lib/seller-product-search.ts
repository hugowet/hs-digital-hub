/** Escape literal search text so it cannot become a wildcard in the seller list. */
export function sellerProductSearchPattern(query: string) {
  return `%${query.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}