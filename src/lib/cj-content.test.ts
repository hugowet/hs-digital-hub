import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mapCjDetails } from "./cj-content";

describe("Dados oficiais CJ", () => {
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
});