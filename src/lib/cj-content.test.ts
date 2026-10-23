import { describe, expect, test } from "bun:test";
import { mapCjDetails } from "./cj-content";

describe("Dados oficiais CJ", () => {
  test("preserva descrição e especificações sem inventar campos", () => {
    const details = mapCjDetails({ description: "<p>Bluetooth 5.3</p><p>Bateria: 400 mAh</p>", productWeight: 120, specifications: { Voltage: "5V" } });
    expect(details.description_long).toBe("Bluetooth 5.3\nBateria: 400 mAh");
    expect(details.specifications["Peso informado pela CJ (g)"]).toBe("120");
    expect(details.specifications.Voltage).toBe("5V");
    expect(details.specifications).not.toHaveProperty("Garantia");
  });
  test("não cria descrição fictícia quando a CJ não fornece dados", () => {
    expect(mapCjDetails({})).toEqual({ description: null, description_long: null, specifications: {} });
  });
});