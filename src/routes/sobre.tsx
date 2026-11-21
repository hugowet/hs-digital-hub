import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MessageCircle, MapPin, Sparkles, Truck, Store } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Sobre a HS Digital Marketplace | Quem somos";
const DESCRIPTION =
  "Conheça a HS Digital Marketplace: marketplace brasileiro criado em 2026 por Hugo Rogério em Rolim de Moura - RO, com pagamentos pelo Mercado Pago.";

export const Route = createFileRoute("/sobre")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://hsdigitalmarketpla.store/sobre" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: TITLE,
          url: "https://hsdigitalmarketpla.store/sobre",
          about: {
            "@type": "Organization",
            name: "HS Digital Marketplace",
            foundingDate: "2026",
            founder: { "@type": "Person", name: "Hugo Rogério" },
          },
        }),
      },
    ],
  }),
  component: SobrePage,
});

const items = [
  { icon: ShieldCheck, title: "Pagamento protegido", text: "Pix, cartão e boleto processados pelo Mercado Pago." },
  { icon: Truck, title: "Envio com rastreio", text: "Produtos nacionais e importados com acompanhamento do pedido." },
  { icon: Store, title: "Vários vendedores", text: "Lojas aprovadas pela HS Digital antes de começar a vender." },
  { icon: Sparkles, title: "Aura", text: "Assistente virtual que ajuda a encontrar produtos na vitrine." },
];

function SobrePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar à vitrine</Link>
        <h1 className="mt-6 font-display text-4xl font-bold">Sobre a HS Digital Marketplace</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A HS Digital Marketplace foi criada em 2026 por <strong className="text-foreground">Hugo Rogério</strong>, em
          Rolim de Moura - RO, para reunir produtos nacionais e importados em um só lugar, com compra simples e
          pagamento seguro.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Fale com a gente</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href="https://wa.me/5569993612254" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                <MessageCircle className="h-4 w-4" /> WhatsApp (69) 99361-2254
              </a>
            </li>
            <li className="inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> Rolim de Moura - RO · Brasil
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
