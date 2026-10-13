import { useState } from "react";
import { Megaphone, Copy, Check, Sparkles, RefreshCw } from "lucide-react";

const PROPAGANDAS = [
  "Conheça a HS Digital! O seu novo marketplace com milhares de produtos nacionais e importados com compra protegida e o preço justo que você procura! 🛒⚡",
  "Oferta diária com até 50% OFF é só na HS Digital! Aproveite nosso envio rápido com frete grátis automático na sua primeira compra. Acesse já! 📦🔥",
  "Quer frete grátis liberado? Assine o Clube HS por apenas R$ 19,90/mês e garanta entregas totalmente gratuitas nas suas compras! 📱💎",
  "Variedade, segurança de pagamento via Mercado Pago e Pix, além de suporte garantido. Venha para a HS Digital, evoluindo com tecnologia para você! 👩‍💻🛒"
];

export function GeradorPropagandaHS() {
  const [textoAnuncio, setTextoAnuncio] = useState(PROPAGANDAS[0]);
  const [copiado, setCopiado] = useState(false);

  const gerarNovoAnuncio = () => {
    const indiceAleatorio = Math.floor(Math.random() * PROPAGANDAS.length);
    setTextoAnuncio(PROPAGANDAS[indiceAleatorio]);
    setCopiado(false);
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(textoAnuncio);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white text-center shadow-xl">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
        <Megaphone className="w-6 h-6 stroke-[2.5]" />
      </div>
      
      <h3 className="text-base font-black flex items-center justify-center gap-1.5">
        Gerador de Propaganda HS <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
      </h3>
      <p className="text-[11px] text-slate-400 mt-1">Crie copys rápidas e profissionais para divulgar sua loja</p>
      
      <div className="my-5 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed text-left min-h-[90px] shadow-inner select-all">
        {textoAnuncio}
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={gerarNovoAnuncio}
          className="px-4 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Mudar Texto
        </button>
        
        <button
          type="button"
          onClick={copiarTexto}
          className="px-4 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
        >
          {copiado ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Copiado!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copiar Texto
            </>
          )}
        </button>
      </div>
    </div>
  );
}
