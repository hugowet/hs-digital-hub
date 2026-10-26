import { validPixCpf } from "./club-pix";

export type BoletoPayer = {
  identificationNumber: string;
  firstName: string;
  lastName: string;
  address: { zipCode: string; streetName: string; streetNumber: string; neighborhood: string; city: string; state: string };
};

export function boletoPayer(email: string, payer: BoletoPayer) {
  if (!validPixCpf(payer.identificationNumber)) throw new Error("Informe um CPF válido para gerar o boleto.");
  return { email, first_name: payer.firstName, last_name: payer.lastName,
    identification: { type: "CPF", number: payer.identificationNumber.replace(/\D/g, "") },
    address: { zip_code: payer.address.zipCode.replace(/\D/g, ""), street_name: payer.address.streetName,
      street_number: payer.address.streetNumber, neighborhood: payer.address.neighborhood,
      city: payer.address.city, federal_unit: payer.address.state.toUpperCase() } };
}

export type BoletoResponse = { status_detail?: string; transaction_details?: { external_resource_url?: string }; barcode?: { content?: string } };

export function boletoDetails(payment: BoletoResponse) {
  const rawUrl = payment.transaction_details?.external_resource_url;
  let url: string | null = null;
  try {
    const parsed = new URL(rawUrl ?? "");
    if (parsed.protocol === "https:" && (parsed.hostname === "mercadopago.com" || parsed.hostname.endsWith(".mercadopago.com") || parsed.hostname === "mercadopago.com.br" || parsed.hostname.endsWith(".mercadopago.com.br"))) url = parsed.href;
  } catch { /* No provider URL yet. */ }
  const barcode = payment.barcode?.content;
  return { status_detail: payment.status_detail ?? null,
    boleto_url: url, boleto_barcode: barcode && /^\d{44,48}$/.test(barcode) ? barcode : null };
}