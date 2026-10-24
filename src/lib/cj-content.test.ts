import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mapCjDetails, mapCjEconomicalDetails } from "./cj-content";

describe("Dados oficiais CJ", () => {
  test("normalização econômica preserva dados oficiais e números sem chamar IA", () => {
    const content = mapCjEconomicalDetails({ description: "<p>Voltage: 5V</p><p>Battery: 400 mAh</p>", packingNameEn: "Plastic bags" });
    assert.equal(content.description, "Tensão: 5V\nBateria: 400 mAh");
    assert.equal(content.specifications.Embalagem, "Sacos plásticos");
    assert.equal(content.specifications.Bateria, "400 mAh");
  });
  test("preserva descrição e especificações sem inventar campos", () => {
    const details = mapCjDetails({ description: "<p>Bluetooth 5.3</p><p>Bateria: 400 mAh</p>", productWeight: 120, specifications: { Voltage: "5V" } });
    assert.equal(details.description_long, "Bluetooth 5.3\nBateria: 400 mAh");
    assert.equal(details.specifications["Peso informado pela CJ (g)"], "120");
    assert.equal(details.specifications.Voltage, "5V");
    assert.equal(Object.hasOwn(details.specifications, "Garantia"), false);
  });
  test("não cria descrição fictícia quando a CJ não fornece dados", () => {
    assert.deepEqual(mapCjDetails({}), { description: null, description_long: null, specifications: {} });
  });
  test("extrai linhas técnicas e listas reais da CJ", () => {
    const details = mapCjDetails({ description: "<p>Processor: RK3036<br/>Interface: HDMI</p>", packingNameEn: '["Plastic bags"]' });
    assert.equal(details.specifications.Processor, "RK3036");
    assert.equal(details.specifications.Interface, "HDMI");
    assert.equal(details.specifications.Embalagem, "Plastic bags");
  });
});