import { expect, it } from "vitest";
import { montinkData, montinkFreight, montinkSeparateShipping } from "./montink";
it("preserves Lupi price with existing margin", () => expect(montinkData({success:true,dadosProduto:{id:"6128536",nomeShopify:"Lupi",preco_final:"80.30"}}).price).toBe(80.30));
it("does not invent stock", () => expect(montinkData({success:true,dadosProduto:{id:"6128536",nomeShopify:"Lupi",preco_final:"80.30"},variacoesEstoque:{Branco:{"":0}}}).stock).toBe(0));
it("charges official freight separately", () => { expect(montinkFreight({success:true,shipping_options:{0:{name:"J&T",value:"30.62",delivery_method_id:16594,business_days:20}}})[0].amount).toBe(30.62); expect(montinkSeparateShipping([{separateShipping:true}])).toBe(true); expect(montinkSeparateShipping([{separateShipping:false}])).toBe(false); });
it("rejects unconfirmed freight", () => expect(() => montinkFreight({success:false})).toThrow());