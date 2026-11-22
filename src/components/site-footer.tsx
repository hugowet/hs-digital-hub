import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/hs-digital-logo.png.asset.json";
import { ShieldCheck, Lock, RotateCcw, MessageCircle, Mail, MapPin, CreditCard, CheckCircle2 } from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-ink-foreground border-t border-white/10">
      {/* Faixa de Segurança e Selos de Confiança */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Mercado Pago</p>
              <p className="text-xs text-white/60">Pix imediato, cartão até 12x e boleto</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Garantia de 7 Dias</p>
              <p className="text-xs text-white/60">Troca ou devolução facilitada (CDC)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Compra 100% Segura</p>
              <p className="text-xs text-white/60">Dados protegidos por criptografia SSL</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Entrega Garantida</p>
              <p className="text-xs text-white/60">Rastreamento oficial até seu endereço</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Rodapé */}
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        {/* Coluna 1: Sobre a Loja */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt="HS Digital Marketplace"
              width={40}
              height={40}
              loading="lazy"
              className="h-10 w-10 rounded-full"
            />
            <span className="font-display text-lg font-bold text-white">HS Digital</span>
          </div>
          <p className="text-xs leading-relaxed text-white/60">
            Marketplace multi-lojas com os melhores fornecedores nacionais e importados. Pagamento protegido pelo
            Mercado Pago e suporte humanizado.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Site Seguro e Verificado
            </span>
          </div>
        </div>

        {/* Coluna 2: Atendimento ao Cliente (SAC) */}
        <div>
          <h4 className="text-sm font-semibold text-white">Atendimento ao Cliente</h4>
          <ul className="mt-3 space-y-2.5 text-xs text-white/70">
            <li>
              <a
                href="https://wa.me/5569993612254?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20na%20HS%20Digital"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                (69) 99361-2254 (WhatsApp)
              </a>
            </li>
            <li>
              <a
                href="mailto:hugoet373@gmail.com"
                className="inline-flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                Suporte Oficial HS Digital (E-mail)
              </a>
            </li>
            <li className="pt-1 text-white/50">Horário: Segunda a Sexta, das 08h às 18h</li>
          </ul>
        </div>

        {/* Coluna 3: Links Úteis */}
        <div>
          <h4 className="text-sm font-semibold text-white">Ajuda & Segurança</h4>
          <ul className="mt-3 space-y-2 text-xs text-white/70">
            <li>
              <Link to="/sobre" className="hover:text-white transition-colors">
                Sobre a HS Digital
              </Link>
            </li>
            <li>Frete, Prazos e Rastreio</li>
            <li>Política de Trocas e Devoluções</li>
            <li>Termos de Uso e Compra</li>
            <li>Privacidade e Proteção de Dados</li>
          </ul>
        </div>

        {/* Coluna 4: Informações Legais */}
        <div>
          <h4 className="text-sm font-semibold text-white">Identificação Legal</h4>
          <ul className="mt-3 space-y-2 text-xs text-white/70">
            <li className="flex items-start gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-white/40 mt-0.5" />
              <span>Atendimento Nacional · Internacional</span>
            </li>
            <li className="text-white/50 text-[11px] leading-relaxed pt-1">
              Operação em conformidade com o Decreto Federal nº 7.962/2013 (Lei do E-commerce) e Código de Defesa do
              Consumidor (Lei nº 8.078/1990).
            </li>
          </ul>
        </div>
      </div>

      {/* Faixa Inferior de Direitos Autorais */}
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50 px-4">
        <p>© {currentYear} HS Digital Marketplace · Todos os direitos reservados.</p>
        <p className="mt-1 text-[11px] text-white/40">
          Pagamentos processados com tecnologia e segurança do Mercado Pago.
        </p>
      </div>
    </footer>
  );
}
