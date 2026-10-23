import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFinalPrice, getMarginRate } from "./pricing";

test("faixa até R$ 30 aplica 120%", () => assert.equal(getMarginRate(30), 1.2));
test("faixa R$ 100,01-300 aplica 40%", () => assert.equal(getMarginRate(147.55), 0.4));
test("custo R$ 147,55 vira R$ 206,90", () => assert.equal(calculateFinalPrice(147.55), 206.9));
test("centavos >= 94 terminam em ,97", () => assert.equal(calculateFinalPrice(10.43), 22.97));
test("valor inteiro desce para ,90", () => assert.equal(calculateFinalPrice(50), 79.9));
