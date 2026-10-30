function value(address: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const entry = address[key];
    if (typeof entry === "string" && entry.trim()) return entry.trim();
  }
  return "";
}

/** Maps persisted checkout and legacy addresses without inventing missing data. */
export function cjDeliveryAddress(address: Record<string, unknown>) {
  const street = value(address, "address", "street_address");
  return {
    shippingCustomerName: value(address, "name", "recipient_name"),
    shippingProvince: value(address, "state"),
    shippingCity: value(address, "city"),
    shippingAddress: street ? [street, value(address, "number", "house_number"),
      value(address, "neighborhood"), value(address, "complement")].filter(Boolean).join(", ") : "",
    shippingZip: value(address, "postalCode", "postal_code", "zip").replace(/\D/g, ""),
    shippingPhone: value(address, "phone").replace(/\D/g, ""),
  };
}