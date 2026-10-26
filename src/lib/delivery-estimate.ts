export function deliveryDateRange(min: number | null | undefined, max: number | null | undefined, reference: string | Date, businessDays = false) {
  if (min == null || max == null || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min || max > 365) return null;
  const date = new Date(reference);
  if (!Number.isFinite(date.getTime())) return null;
  const add = (days: number) => {
    const result = new Date(date);
    for (let count = 0; count < days;) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (!businessDays || ![0, 6].includes(result.getUTCDay())) count++;
    }
    return result.toISOString().slice(0, 10);
  };
  return { from: add(min), to: add(max) };
}

export function formatDeliveryRange(range: ReturnType<typeof deliveryDateRange>) {
  if (!range) return "Prazo não informado pelo transportador";
  const format = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date));
  return `Chegada estimada entre ${format(range.from)} e ${format(range.to)}`;
}