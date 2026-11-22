import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MessageCircle, MapPin, Sparkles, Truck, Store, UserCheck, Award, Users } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Sobre a HS Digital Marketplace | Hugo Rogério - Fundador";
const DESCRIPTION =
  "Conheça a HS Digital Marketplace: plataforma brasileira de comércio eletrônico fundada em 2026 por Hugo Rogério, conectando múltiplos lojistas, vendedores parceiros e compradores em todo o Brasil.";
const PROFILE_IMAGE =
  "https://hsdigitalmarketpla.store/__l5e/assets-v1/56687e64-f7b3-4418-93f1-0bf8749fdfb8/hugo-rogerio-perfil.jpg";

export const Route = createFileRoute("/sobre")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { property: "og:image", content: PROFILE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: PROFILE_IMAGE },
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
          primaryImageOfPage: PROFILE_IMAGE,
          about: {
            "@type": "Organization",
            name: "HS Digital Marketplace",
            url: "https://hsdigitalmarketpla.store",
            foundingDate: "2026",
            description:
              "Marketplace brasileiro com múltiplos vendedores parceiros, compras protegidas e envio com rastreio em todo o território nacional.",
            founder: {
              "@type": "Person",
              name: "Hugo Rogério",
              jobTitle: "Fundador e Idealizador",
              image: PROFILE_IMAGE,
              sameAs: "https://hsdigitalmarketpla.store/sobre",
            },
            areaServed: {
              "@type": "Country",
              name: "Brasil",
            },
          },
        }),
      },
    ],
  }),
  component: SobrePage,
});

const galeria = [
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/d0aa761c-c729-4398-8e10-ea7ac2e36305/mascote-lupi-app.jpg",
    alt: "Mascote oficial Lupi segurando o aplicativo da HS Digital Marketplace",
    legenda: "Lupi — Mascote Oficial da HS Digital Marketplace",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/9e6cfadf-1a7d-4a0f-8ac3-577fdc32ff95/hugo-rogerio-loja-oficial-hs-digital.jpg",
    alt: "Hugo Rogério na loja oficial da marca HS Digital Marketplace",
    legenda: "Hugo na loja oficial da marca",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/884fb02e-1759-4cc7-8072-1020c5cc97e7/hugo-rogerio-expo-hs-digital.jpg",
    alt: "Hugo Rogério no estande da HS Digital Marketplace na Expo 2025",
    legenda: "Estande na Expo 2025",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/c1f3b0e1-31c7-48f1-b93a-72469fd07028/hugo-rogerio-empreendedorismo-hs-digital.jpg",
    alt: "Hugo Rogério no estúdio de empreendedorismo da HS Digital",
    legenda: "Trajetória de empreendedorismo e inovação",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/ff1a9388-122c-4805-9928-918a90edd10b/hugo-rogerio-camiseta.jpg",
    alt: "Hugo Rogério com estilo autêntico e moderno",
    legenda: "Identidade autêntica da marca",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/e11014df-5ab0-4ac8-93d3-1e848a70c3dc/hugo-rogerio-selfie-1.jpg",
    alt: "Hugo Rogério, criador e idealizador da plataforma HS Digital",
    legenda: "Acompanhando de perto as novidades da plataforma",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/d9331d37-3931-4ddc-b0fe-8ad087264a6b/hugo-rogerio-fundador-hs-digital.jpg",
    alt: "Hugo Rogério na estrutura de atendimento da HS Digital",
    legenda: "Construindo uma comunidade de vendedores e compradores",
  },
  {
    url: "https://hsdigitalmarketpla.store/__l5e/assets-v1/e2229458-7b76-4a7c-aa30-485b4a4248b7/hugo-rogerio-mascote-lupi-hs-digital.jpg",
    alt: "Hugo Rogério ao lado do mascote oficial Lupi",
    legenda: "Com o mascote Lupi",
  },
];

const items = [
  {
    icon: Users,
    title: "Múltiplos vendedores parceiros",
    text: "Lojistas e vendedores independentes cadastram e gerenciam seus produtos com aprovação da HS Digital.",
  },
  {
    icon: ShieldCheck,
    title: "Pagamento 100% protegido",
    text: "Pix, cartão e boleto processados pelo Mercado Pago com liberação segura após a entrega.",
  },
  {
    icon: Truck,
    title: "Envio com rastreamento",
    text: "Centros de distribuição parceiros no Brasil e envio internacional com código de rastreio em tempo real.",
  },
  {
    icon: Store,
    title: "Curadoria de produtos",
    text: "Variedade em eletrônicos, moda, ferramentas, casa e utilidades selecionadas com garantia.",
  },
  {
    icon: Sparkles,
    title: "Aura Inteligente",
    text: "Assistente virtual da vitrine que auxilia na busca das melhores ofertas e produtos.",
  },
];

function SobrePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar à vitrine
        </Link>

        {/* Card do Fundador */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <img
              src={PROFILE_IMAGE}
              alt="Hugo Rogério, criador e fundador da HS Digital Marketplace"
              className="h-36 w-36 rounded-2xl object-cover shadow-md sm:h-44 sm:w-44"
              loading="eager"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <UserCheck className="h-3.5 w-3.5" /> Fundador & Idealizador
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Award className="h-3.5 w-3.5 text-primary" /> Marketplace Brasileiro
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Hugo Rogério</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Fundador da HS Digital Marketplace · Brasil
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                A <strong className="text-foreground">HS Digital Marketplace</strong> foi criada por{" "}
                <strong className="text-foreground">Hugo Rogério</strong> como uma plataforma aberta e dinâmica,
                reunindo múltiplos vendedores parceiros de várias regiões do país e catálogo selecionado de fornecedores
                homologados, sempre com compra segura, split de pagamento e suporte dedicado.
              </p>
            </div>
          </div>
        </section>

        {/* Galeria de Fotos */}
        <section className="mt-10">
          <div>
            <h2 className="font-display text-2xl font-bold">Galeria & Identidade Oficial</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nossa história visual, presença em eventos, mascote oficial e equipe.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galeria.map((foto, idx) => (
              <figure
                key={idx}
                className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <img src={foto.url} alt={foto.alt} className="h-64 w-full object-cover" loading="lazy" />
                <figcaption className="p-3 text-xs font-medium text-muted-foreground">{foto.legenda}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Como funciona o Marketplace */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Como funciona a HS Digital</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uma estrutura completa para aproximar clientes de lojas qualificadas em todo o país.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Atendimento Oficial */}
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Atendimento Oficial</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href="https://wa.me/5569993612254"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp Oficial de Atendimento: (69) 99361-2254
              </a>
            </li>
            <li className="inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> Brasil · Atendimento em todo o território nacional
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
