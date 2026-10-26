import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoletoPayer } from "@/lib/boleto";

export function BoletoForm({ onSubmit, initialAddress }: { onSubmit: (payer: BoletoPayer) => Promise<void>; initialAddress?: Record<string, unknown> | null }) {
  const [busy, setBusy] = useState(false);
  const [payer, setPayer] = useState<BoletoPayer>({ identificationNumber: "", firstName: "", lastName: "", address: {
    zipCode: String(initialAddress?.postal_code ?? initialAddress?.postalCode ?? ""),
    streetName: String(initialAddress?.address ?? ""), streetNumber: "", neighborhood: "",
    city: String(initialAddress?.city ?? ""), state: String(initialAddress?.state ?? ""),
  } });
  const fields = [
    ["identificationNumber", "CPF do pagador", "000.000.000-00"], ["firstName", "Nome", "Nome"], ["lastName", "Sobrenome", "Sobrenome"],
    ["zipCode", "CEP", "00000-000"], ["streetName", "Rua / avenida", "Rua, sem número"], ["streetNumber", "Número", "Número"],
    ["neighborhood", "Bairro", "Bairro"], ["city", "Cidade", "Cidade"], ["state", "UF", "RR"],
  ];
  return <form className="space-y-3 pt-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true);
    try { await onSubmit(payer); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o boleto."); } finally { setBusy(false); }
  }}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <Label key={key} className="min-w-0 space-y-1">
      <span>{label}</span><Input required placeholder={placeholder} aria-label={label} autoComplete="off"
        inputMode={key === "identificationNumber" || key === "zipCode" ? "numeric" : "text"}
        maxLength={key === "state" ? 2 : key === "identificationNumber" ? 14 : 150}
        value={key in payer.address ? payer.address[key as keyof BoletoPayer["address"]] : payer[key as "identificationNumber" | "firstName" | "lastName"]}
        onChange={(event) => setPayer((old) => key in old.address ? { ...old, address: { ...old.address, [key]: event.target.value } } : { ...old, [key]: event.target.value })} />
    </Label>)}</div>
    <p className="text-xs text-muted-foreground">O envio e a liberação de produtos digitais começam somente após a confirmação do pagamento. A compensação do boleto não é imediata.</p>
    <Button type="submit" className="w-full" disabled={busy}>{busy ? "Gerando boleto…" : "Gerar boleto"}</Button>
  </form>;
}

export function BoletoPayment({ details, expiresAt, status }: { details: unknown; expiresAt: string | null; status: string }) {
  const value = details && typeof details === "object" ? details as Record<string, unknown> : {};
  const url = typeof value.boleto_url === "string" ? value.boleto_url : null;
  const barcode = typeof value.boleto_barcode === "string" ? value.boleto_barcode : null;
  const terminal = ["cancelled", "expired", "rejected", "refunded", "charged_back"].includes(status);
  return <div className="mt-4 space-y-3 border-t border-border pt-4">
    <h3 className="font-semibold">{terminal ? "Boleto encerrado" : "Boleto gerado · aguardando pagamento"}</h3>
    {!terminal && <><p className="text-sm text-muted-foreground">A compra será confirmada após o Mercado Pago reconhecer o pagamento. Cada loja tem seu próprio boleto.</p>
      {url && <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Abrir boleto</a></Button>}
      {barcode && <div><p className="break-all font-mono text-xs text-muted-foreground">{barcode}</p><Button variant="outline" className="mt-2" onClick={async () => { await navigator.clipboard.writeText(barcode); toast.success("Código de barras copiado"); }}><Copy />Copiar código de barras</Button></div>}
      {!url && !barcode && <p className="text-sm text-muted-foreground">O Mercado Pago ainda está disponibilizando o boleto. A página atualiza automaticamente.</p>}
      {expiresAt && <p className="text-xs text-muted-foreground">Vencimento: {new Date(expiresAt).toLocaleDateString("pt-BR")}</p>}
    </>}
  </div>;
}