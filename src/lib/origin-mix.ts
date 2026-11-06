/** Interleave 4 Amazon (national) products per 1 CJ (imported), keeping each group's order. Others go last. */
export function mixByOrigin<T extends { supplier?: string | null }>(items: T[]): T[] {
  const amazon = items.filter((p) => p.supplier === "amazon");
  const cj = items.filter((p) => p.supplier === "cj");
  const other = items.filter((p) => p.supplier !== "amazon" && p.supplier !== "cj");
  const out: T[] = [];
  let a = 0;
  let c = 0;
  while (a < amazon.length || c < cj.length) {
    for (let i = 0; i < 4 && a < amazon.length; i++) out.push(amazon[a++]);
    if (c < cj.length) out.push(cj[c++]);
  }
  return out.concat(other);
}
