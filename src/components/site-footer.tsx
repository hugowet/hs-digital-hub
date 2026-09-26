import logoAsset from "@/assets/hs-digital-logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-ink-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg primary-gradient font-display font-bold">
              HS
            </span>
            <span className="font-display text-lg font-bold">HS Digital</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            Marketplace multi-lojas com split de pagamento automático entre vendedor e plataforma.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold">Compradores</h4>
          <ul className="mt-3 space-y-2 text-white/60">
            <li>Como comprar</li>
            <li>Frete e prazos</li>
            <li>Devoluções</li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-semibold">Vendedores</h4>
          <ul className="mt-3 space-y-2 text-white/60">
            <li>Abrir minha loja</li>
            <li>Taxas e comissões</li>
            <li>Central do vendedor</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} HS Digital · Todos os direitos reservados
      </div>
    </footer>
  );
}
