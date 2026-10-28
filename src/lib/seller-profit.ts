export function mayViewSaleProfit(email: string | null | undefined) {
  return email?.trim().toLowerCase() === 'hugohug12ou@gmail.com';
}

export function saleProfit(proceeds: number, costs: Array<{ quantity: number; unitCost: number | null }>, freight: number | null) {
  if (!costs.length || !Number.isFinite(proceeds) || freight === null || !Number.isFinite(freight) || freight < 0 || costs.some(i => i.unitCost === null || !Number.isFinite(i.unitCost) || i.unitCost < 0 || !Number.isInteger(i.quantity) || i.quantity <= 0)) return null;
  const products = costs.reduce((s, i) => s + Number(i.unitCost) * i.quantity, 0);
  return { products: Math.round(products * 100) / 100, freight, profit: Math.round((proceeds - products - freight) * 100) / 100 };
}