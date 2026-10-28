import { expect, it } from "vitest";
import { cjInterestGroup, chooseCjCategory } from "./cj-selection";

it.each([
  ["Phones / Smartphones", "phones"],
  ["Consumer Electronics / Smart Electronics / Smart Watches", "watches"],
  ["Consumer Electronics / Portable Audio & Video / Earphones & Headphones", "audio"],
  ["Bags & Shoes / Women's Shoes / Flats", "footwear"],
  ["Hardware / Power Tools / Electric Drills", "tools"],
])("seleciona a categoria de interesse %s", (path, group) => expect(cjInterestGroup(path)).toBe(group));
it("não importa bolsas só porque a categoria mãe menciona calçados", () => {
  expect(cjInterestGroup("Bags & Shoes / Men's Luggage & Bags / Briefcases")).toBeNull();
});
it("não deixa peças de carro e enfeites genéricos encherem novas importações", () => {
  expect(cjInterestGroup("Automobiles & Motorcycles / Auto Replacement Parts / Car Brake System")).toBeNull();
  expect(cjInterestGroup("Home / Decor / Stickers")).toBeNull();
});
it("alterna interesse em vez de importar só relógios", () => {
  const audio = { category_path: "Audio / Headphones" };
  expect(chooseCjCategory([{ category_path: "Watches / Smart Watches" }, audio], [{ category_path: "Watches / Watches" }])).toEqual(audio);
});