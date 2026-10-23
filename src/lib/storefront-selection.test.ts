import { test } from "node:test";
import assert from "node:assert/strict";
import { storefrontDay, usesDailySelection } from "./storefront-selection";

const all = { query: "", category: null, range: "all", sort: "popular", onlyFreeShipping: false };

test("a seleção diária se aplica à vitrine inicial Todos", () => {
  assert.equal(usesDailySelection(all), true);
});
test("busca e filtros mantêm o catálogo normal", () => {
  for (const filter of [{ query: "fone" }, { category: "moda" }, { range: "a" }, { sort: "price-asc" }, { onlyFreeShipping: true }]) {
    assert.equal(usesDailySelection({ ...all, ...filter }), false);
  }
});
test("a vitrine muda no início de cada dia em Boa Vista", () => {
  assert.equal(storefrontDay(new Date("2026-10-24T03:59:59Z")), "2026-10-23");
  assert.equal(storefrontDay(new Date("2026-10-24T04:00:00Z")), "2026-10-24");
});