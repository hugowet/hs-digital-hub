export function savedDeliveryPostalCode(addresses: Array<{ postal_code: string | null; is_default: boolean }>): string {
  const address = addresses.find((entry) => entry.is_default) ?? addresses[0];
  const postalCode = address?.postal_code?.replace(/\D/g, "") ?? "";
  return postalCode.length === 8 ? postalCode : "";
}