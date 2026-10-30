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
it("inclui peças e acessórios de carro e moto, lanternas, mochilas e chaveiros", () => {
  expect(cjInterestGroup("Automobiles & Motorcycles / Auto Replacement Parts")).toBe("vehicles");
  expect(cjInterestGroup("Automobiles & Motorcycles / Motorcycle Accessories & Parts")).toBe("vehicles");
  expect(cjInterestGroup("Lights / Portable Lighting / Flashlights")).toBe("lights");
  expect(cjInterestGroup("Bags / School Bags")).toBe("backpacks");
  expect(cjInterestGroup("Jewelry / Key Chains")).toBe("keychains");
});
it("não deixa enfeites genéricos encherem novas importações", () => {
  expect(cjInterestGroup("Home / Decor / Stickers")).toBeNull();
});
it("alterna interesse em vez de importar só relógios", () => {
  const audio = { category_path: "Audio / Headphones" };
  expect(chooseCjCategory([{ category_path: "Watches / Smart Watches" }, audio], [{ category_path: "Watches / Watches" }])).toEqual(audio);
});