import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  MessageCircle,
  MapPin,
  Sparkles,
  Truck,
  Store,
  UserCheck,
  Award,
  Users,
  BookOpen,
  CalendarDays,
  Home,
  Rocket,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Nossa História | HS Digital Marketplace e Hugo Rogério";
const DESCRIPTION =
  "Conheça a história da HS Digital Marketplace, da ideia criada por Hugo Rogério dos Santos em 2023 ao marketplace brasileiro lançado em 2026.";
const PROFILE_IMAGE =
  "https://hsdigitalmarketpla.store/__l5e/assets-v1/56687e64-f7b3-4418-93f1-0bf8749fdfb8/hugo-rogerio-perfil.jpg";
const PAGE_URL = "https://hsdigitalmarketpla.store/sobre";

export const Route = createFileRoute("/sobre")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: PROFILE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: PROFILE_IMAGE },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: TITLE,
          description: DESCRIPTION,
          url: PAGE_URL,
          primaryImageOfPage: PROFILE_IMAGE,
          about: {
            "@type": "Organization",
            name: "HS Digital Marketplace",
            alternateName: "HS Digital",
            url: "https://hsdigitalmarketpla.store",
            foundingDate: "2026",
            description:
              "Marketplace brasileiro criado por Hugo Rogério dos Santos. A marca HS Digital surgiu em 2023 e ampliou seu propósito em 2026 para conectar compradores e vendedores.",
            founder: {
              "@type": "Person",
              name: "Hugo Rogério dos Santos",
              alternateName: "Hugo Rogério",
              jobTitle: "Fundador e Idealizador",
              birthDate: "2000-02-21",
              birthPlace: { "@type": "Place", name: "Bahia, Brasil" },
              image: PROFILE_IMAGE,
              url: PAGE_URL,
            },
            areaServed: { "@type": "Country", name: "Brasil" },
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://hsdigitalmarketpla.store/" },
            { "@type": "ListItem", position: 2, name: "Nossa História", item: PAGE_URL },
          ],
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

const historia = [
  {
    icon: CalendarDays,
    periodo: "2023",
    titulo: "O início: visão e empreendedorismo com recursos próprios",
    texto:
      "A ideia original da marca surgiu em 2023, inicialmente batizada como HS Digital — unindo as iniciais de Hugo Santos ao foco inicial em infoprodutos, como e-books e templates.",
  },
  {
    icon: Home,
    periodo: "Os primeiros seis meses",
    titulo: "Uma operação que começou dentro de casa",
    texto:
      "Sem capital inicial para investir imediatamente na construção de uma plataforma própria, Hugo transformou o desafio em oportunidade. Com espírito prático, iniciou suas operações utilizando a própria residência como estoque. Ele adquiria produtos em grandes plataformas de comércio eletrônico, como a Shopee, divulgava nas redes sociais e realizava pessoalmente as embalagens e entregas locais em sua cidade. Durante seis meses, essa operação funcionou como sua fonte de renda extra e laboratório prático de vendas e atendimento ao cliente.",
  },
  {
    icon: BookOpen,
    periodo: "A virada de chave",
    titulo: "Uma pausa para planejar algo maior",
    texto:
      "Após mudar de cidade e enfrentar o desafio de recomeçar longe de sua rede inicial de contatos, Hugo decidiu pausar as revendas locais para planejar um passo muito maior.",
  },
  {
    icon: Rocket,
    periodo: "Início de 2026",
    titulo: "A evolução para marketplace",
    texto:
      "O projeto ganhou uma nova dimensão. Mantendo a essência da marca original, a empresa expandiu seu propósito para além dos produtos digitais e passou a atuar com um catálogo amplo — abrangendo eletrônicos, ferramentas, utilidades e diversos outros segmentos. Nascia assim a HS Digital Marketplace, uma plataforma estruturada para conectar compradores e vendedores de forma ágil, segura e eficiente.",
  },
  {
    icon: Sparkles,
    periodo: "O presente e o futuro",
    titulo: "Inovação e oportunidades no comércio digital",
    texto:
      "Hoje, aos 26 anos, Hugo Rogério dos Santos lidera a HS Digital Marketplace com foco em inovação, escalabilidade e marketing estratégico — área em que também atua impulsionando o crescimento de negócios parceiros. O que começou dentro de casa, com zero investimento e muita força de vontade, consolidou-se como uma empresa em pleno crescimento, movida pelo propósito de gerar oportunidades no comércio digital brasileiro.",
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

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <img
              src={PROFILE_IMAGE}
              alt="Hugo Rogério dos Santos, criador e fundador da HS Digital Marketplace"
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
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Hugo Rogério dos Santos</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Fundador da HS Digital Marketplace · Brasil</p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                A <strong className="text-foreground">HS Digital Marketplace</strong> foi criada por{" "}
                <strong className="text-foreground">Hugo Rogério dos Santos</strong> como uma plataforma aberta e dinâmica,
                reunindo múltiplos vendedores parceiros de várias regiões do país e catálogo selecionado de fornecedores
                homologados, sempre com compra segura, split de pagamento e suporte dedicado.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="nossa-historia">
          <div className="max-w-3xl">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">Nossa trajetória</span>
            <h2 id="nossa-historia" className="mt-2 font-display text-3xl font-bold">
              Nossa História: como nasceu a HS Digital Marketplace
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              A HS Digital Marketplace nasceu da visão empreendedora e da determinação de Hugo Rogério dos Santos. Nascido
              no dia 21 de fevereiro de 2000, no estado da Bahia, Hugo mudou-se ainda criança para Rondônia ao lado de seus
              pais, Rosilene Rogério Homem e Valdenir Jesus dos Santos, e de seus quatro irmãos — Verônica, Yuri, Vitória e
              João Vitor — em busca de novas oportunidades e crescimento.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {historia.map(({ icon: Icon, periodo, titulo, texto }) => (
              <article key={periodo} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{periodo}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{titulo}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{texto}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div>
            <h2 className="font-display text-2xl font-bold">Galeria & Identidade Oficial</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nossa história visual, presença em eventos, mascote oficial e equipe.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galeria.map((foto) => (
              <figure
                key={foto.url}
                className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <img src={foto.url} alt={foto.alt} className="h-64 w-full object-cover" loading="lazy" />
                <figcaption className="p-3 text-xs font-medium text-muted-foreground">{foto.legenda}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-12">
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

        <section className="mt-12 rounded-xl border border-border bg-card p-6">
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
