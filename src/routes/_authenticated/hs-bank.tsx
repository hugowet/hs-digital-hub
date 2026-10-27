import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Wallet, RefreshCw, Landmark, Ticket } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getHsBank, requestHsBankCredit } from "@/lib/hs-bank.functions";
import { brl } from "@/lib/format";
import loop from "@/assets/loop-mascote.png.asset.json";

const bankQuery = queryOptions({ queryKey: ["hs-bank"], queryFn: () => getHsBank(), staleTime: 15000 });
export const Route = createFileRoute("/_authenticated/hs-bank")({
  staticData: { sitemap: false },
  loader: ({ context }) => context.queryClient.ensureQueryData(bankQuery),
  head: () => ({ meta: [
    { title: "HS Bank · Carteira oficial HS Digital" },
    { name: "description", content: "Sua carteira HS Digital: saldos internos, extrato de vendas e solicitações de antecipação." },
    { property: "og:title", content: "HS Bank · Sua carteira HS Digital" },
    { property: "og:description", content: "Acompanhe suas vendas e valores registrados na HS Digital com pagamento processado pelo Mercado Pago." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: HsBankPage,
});

function SecurityNote() {
  return <span className="flex items-center gap-2 text-xs"><ShieldCheck className="size-4 shrink-0" />Transações seguras e liquidadas via Mercado Pago</span>;
}

function HsBankPage() {
  const { data, isFetching } = useSuspenseQuery(bankQuery);
  const qc = useQueryClient();
  const requestCredit = useServerFn(requestHsBankCredit);
  const [visible, setVisible] = useState(true);
  const [transfer, setTransfer] = useState(false);
  const [pending, setPending] = useState(false);
  const amount = (value: number) => visible ? brl(value) : "••••••";
  const submit = async () => {
    if (!data.store) return;
    setPending(true);
    try {
      await requestCredit({ data: { storeId: data.store.id } });
      await qc.invalidateQueries({ queryKey: ["hs-bank"] });
      toast.success("Interesse registrado. Nenhum crédito foi contratado ou liberado.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a solicitação."); }
    finally { setPending(false); }
  };
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild><Link to="/vendedor"><ArrowLeft />Painel do vendedor</Link></Button>
        <Button variant="ghost" size="icon" aria-label="Atualizar carteira" title="Atualizar carteira" disabled={isFetching} onClick={() => void qc.invalidateQueries({ queryKey: ["hs-bank"] })}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button>
      </div>
      <header className="flex items-center justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-bank"><Landmark className="size-9 shrink-0" /><h1 className="text-3xl font-bold sm:text-4xl">HS Bank</h1></div>
          <p className="mt-2 text-sm text-muted-foreground">Carteira oficial da HS Digital · {data.store?.name ?? "Sua conta"}</p>
          <div className="mt-4 text-muted-foreground"><SecurityNote /></div>
        </div>
        <img src={loop.url} alt="Loop, mascote do HS Bank" className="h-28 w-24 shrink-0 object-contain sm:h-36 sm:w-32" />
      </header>
      {!data.store ? <section className="py-12"><h2 className="text-xl font-semibold">Sua carteira de vendedor</h2><p className="mt-3 text-muted-foreground">O saldo e o extrato ficam disponíveis após a aprovação da sua loja.</p><Button variant="bank" asChild className="mt-5"><Link to="/vendedor">Acompanhar minha loja<ArrowUpRight /></Link></Button></section> : <>
        <section className="grid gap-5 py-7 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg bg-bank p-6 text-bank-foreground sm:p-8">
            <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm"><Wallet className="size-4" />Saldo Atual</p><Button variant="ghost" size="icon" className="text-bank-foreground hover:bg-bank-foreground/10 hover:text-bank-foreground" title={visible ? "Ocultar valores" : "Mostrar valores"} aria-label={visible ? "Ocultar valores" : "Mostrar valores"} onClick={() => setVisible(!visible)}>{visible ? <Eye /> : <EyeOff />}</Button></div>
            <p className="my-4 break-words text-4xl font-semibold tabular-nums">{amount(data.store.balance)}</p>
            <p className="mb-5 text-xs">Saldo interno liberado após registro de entrega. Não é o saldo da conta Mercado Pago.</p>
            <SecurityNote />
          </div>
          <div className="flex flex-col justify-center gap-5 border-l border-border pl-5">
            <div><p className="text-sm text-muted-foreground">A liberar após entrega</p><p className="mt-2 text-2xl font-semibold tabular-nums">{amount(data.held)}</p></div>
            <Button variant="bank" className="w-fit" onClick={() => setTransfer(true)}><ArrowUpRight />Transferir Saldo / Pix</Button>
            <p className="text-xs text-muted-foreground">Transferências são realizadas na sua conta Mercado Pago; não há saque direto habilitado no HS Bank.</p>
          </div>
        </section>
        <Tabs defaultValue="statement">
          <TabsList className="h-auto w-full justify-start flex-wrap gap-1 bg-bank-soft"><TabsTrigger value="statement">Extrato e Histórico</TabsTrigger><TabsTrigger value="credit">Crédito e Antecipação</TabsTrigger><TabsTrigger value="launch">HSBANK50</TabsTrigger></TabsList>
          <TabsContent value="statement" className="py-6">
            <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Movimentações recentes</h2><p className="text-xs text-muted-foreground">Até 50 registros · Comissão atual: 12%</p></div>
            <p className="mt-2 text-xs text-muted-foreground">Valores brutos podem incluir envio. Comissão e líquido seguem o registro real de cada venda; taxas do Mercado Pago não estão descontadas deste extrato.</p>
            <div className="mt-5 divide-y divide-border">
              {data.transactions.map((tx) => <article key={tx.id} className="flex gap-3 py-5 sm:gap-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bank-soft text-bank"><ArrowDownLeft className="size-5" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><Link to="/pedido/$orderId" params={{ orderId: tx.orderId }} className="font-semibold hover:underline">Pedido #{tx.orderId.slice(0, 8)}</Link><time className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("pt-BR")}</time></div>
                  <p className="mt-1 text-xs text-muted-foreground">{tx.status === "approved" ? tx.released ? "Pago · Liberado no saldo interno" : "Pago · Aguardando entrega" : tx.status === "pending" ? "Aguardando pagamento" : "Pagamento não aprovado / encerrado"}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Valor bruto</dt><dd className="mt-1 tabular-nums">{amount(tx.gross)}</dd></div><div><dt className="text-xs text-muted-foreground">Comissão registrada</dt><dd className="mt-1 tabular-nums">{amount(tx.fee)}</dd></div><div><dt className="text-xs text-muted-foreground">Líquido registrado</dt><dd className="mt-1 font-semibold tabular-nums text-bank">{amount(tx.net)}</dd></div></dl>
                </div>
              </article>)}
              {!data.transactions.length && <div className="py-12 text-center"><Wallet className="mx-auto size-8 text-bank" /><p className="mt-3 font-semibold">Nenhuma movimentação ainda</p><p className="mt-2 text-sm text-muted-foreground">Suas vendas aparecerão aqui quando houver pedidos.</p></div>}
            </div>
          </TabsContent>
          <TabsContent value="credit" className="max-w-2xl py-8">
            <LockKeyhole className="size-8 text-bank" /><h2 className="mt-4 text-xl font-semibold">Crédito e Antecipação</h2>
            <p className="mt-3 text-sm text-muted-foreground">Elegibilidade inicial: loja aprovada com vendas pagas nos últimos 30 dias. Uma solicitação registra interesse, não aprova nem contrata empréstimo.</p>
            <div className="my-6 border-l-2 border-bank pl-4"><p className="font-semibold">Retenção proposta: 15% das vendas futuras</p><p className="mt-2 text-sm text-muted-foreground">Somente após contrato e integração com instituição autorizada, até quitar o saldo devedor. Nenhuma retenção de crédito está ativa.</p></div>
            <p className="mb-4 text-sm font-medium">{data.request ? "Interesse registrado · aguardando habilitação do provedor" : data.eligible ? "Histórico elegível para registrar interesse" : "Solicitação bloqueada: sem vendas pagas nos últimos 30 dias"}</p>
            <Button variant="bank" disabled={!data.eligible || !!data.request || pending} onClick={() => void submit()}><Landmark />{pending ? "Registrando…" : "Solicitar análise de crédito"}</Button>
          </TabsContent>
          <TabsContent value="launch" className="max-w-2xl py-8">
            <Ticket className="size-8 text-bank" /><h2 className="mt-4 text-xl font-semibold">Campanha HSBANK50 · Não ativada</h2>
            <p className="mt-3 text-sm text-muted-foreground">Condições previstas: R$ 50 de desconto na primeira compra, em carrinhos a partir de R$ 150, para os primeiros 10 compradores elegíveis, sem reutilização de CPF ou dispositivo.</p>
            <p className="mt-4 text-sm text-muted-foreground">Ativação depende de verba própria para o desconto, verificação de identidade e resgate simultâneo protegido. O desconto não será retirado da margem protegida dos produtos CJ.</p>
          </TabsContent>
        </Tabs>
      </>}
      <footer className="mt-8 border-t border-border py-6 text-xs leading-relaxed text-muted-foreground">HS Bank © 2026. Infraestrutura de pagamento e serviços de liquidação processados com a tecnologia e segurança do Mercado Pago.<p className="mt-2">HS Bank é a carteira e o extrato internos da HS Digital; não é uma instituição bancária, nem representa parceria bancária ou custódia de valores.</p></footer>
    </main>
    <Dialog open={transfer} onOpenChange={setTransfer}><DialogContent><DialogHeader><DialogTitle>Transferir Saldo / Pix</DialogTitle><DialogDescription>O HS Bank não movimenta seu saldo bancário. Consulte valores disponíveis e faça transferências diretamente na sua conta Mercado Pago. A liberação interna após entrega não retém dinheiro na conta Mercado Pago.</DialogDescription></DialogHeader><Button variant="bank" asChild><a href="https://www.mercadopago.com.br/" target="_blank" rel="noopener noreferrer">Abrir Mercado Pago<ArrowUpRight /></a></Button></DialogContent></Dialog>
  </div>;
}