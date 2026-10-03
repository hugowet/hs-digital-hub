import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleHelp,
  Clock,
  Gift,
  HelpCircle,
  MessageCircle,
  Mic,
  MicOff,
  Package,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Truck,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "aura" | "user";
  text: string;
  time: string;
  link?: { label: string; url: string };
  actionTag?: string;
  couponCode?: string;
}

function AuraAvatar() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 text-white shadow-md">
      <Sparkles className="h-5 w-5 text-amber-200" />
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#00a650] shadow-sm" />
    </div>
  );
}

export function AuraChatWidget() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: "welcome",
        sender: "aura",
        text: "Oi, tudo bem? Meu nome é Aura! 😊 Sou sua consultora pessoal aqui na HS Digital. Se você tiver alguma dúvida sobre produtos, prazos de entrega, garantia ou quiser um cupom de frete grátis, só me falar que resolvo na hora para você!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionTag: "Atendimento Humanizado",
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Ouvindo... pode falar!", { duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  if (!mounted) return null;

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: query,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const q = query.toLowerCase();
      let responseText = "";
      let linkAction: { label: string; url: string } | undefined;
      let actionTag: string | undefined;
      let couponCode: string | undefined;

      // 1. CUPOM / FRETE GRÁTIS / PROMOÇÃO
      if (
        q.includes("cupom") ||
        q.includes("desconto") ||
        q.includes("frete gratis") ||
        q.includes("frete grátis") ||
        q.includes("primeira compra") ||
        q.includes("codigo")
      ) {
        responseText =
          "Que ótima notícia! Você tem direito ao cupom PRIMEIRACOMPRA para zerar o frete do seu pedido hoje mesmo! 🎉 Basta aplicar no carrinho ou clicar no botão abaixo:";
        linkAction = { label: "Ir ao Carrinho com Cupom", url: "/carrinho" };
        actionTag = "Benefício Exclusivo";
        couponCode = "PRIMEIRACOMPRA";
      }
      // 2. ENTREGA, PRAZO E FORNECEDORES (CJ & DROPI NACIONAL)
      else if (
        q.includes("prazo") ||
        q.includes("entrega") ||
        q.includes("demora") ||
        q.includes("envio") ||
        q.includes("chega quando") ||
        q.includes("correios") ||
        q.includes("fornecedor") ||
        q.includes("dropi") ||
        q.includes("cj")
      ) {
        responseText =
          "Trabalhamos com os melhores centros de distribuição! Produtos com envio nacional chegam em média de 3 a 7 dias úteis. Já os itens importados exclusivos chegam entre 7 e 15 dias corridos, sempre com código de rastreamento oficial dos Correios enviado para o seu WhatsApp e e-mail.";
        linkAction = { label: "Ver Produtos com Envio Rápido", url: "/?category=all" };
        actionTag = "Logística & Rastreio";
      }
      // 3. SEGURANÇA, MERCADO PAGO E GARANTIA DE 30 DIAS
      else if (
        q.includes("garantia") ||
        q.includes("devolucao") ||
        q.includes("devolução") ||
        q.includes("seguro") ||
        q.includes("confiavel") ||
        q.includes("golpe") ||
        q.includes("reembolso")
      ) {
        responseText =
          "Pode comprar com 100% de tranquilidade! Seu pagamento fica protegido pelo Mercado Pago e você conta com a Compra Garantida HS Digital: se o produto não chegar ou vier diferente do esperado, devolvemos seu dinheiro integralmente em até 30 dias.";
        actionTag = "Garantia Total";
      }
      // 4. MEUS PEDIDOS / RASTREAMENTO
      else if (
        q.includes("meus pedidos") ||
        q.includes("minhas compras") ||
        q.includes("onde esta") ||
        q.includes("rastrear") ||
        q.includes("pedido")
      ) {
        responseText =
          "Você pode acompanhar cada etapa do seu pacote na aba 'Minhas Compras'. Lá fica o status de aprovação e o código para acompanhar pelo site dos Correios!";
        linkAction = { label: "Acessar Minhas Compras", url: "/compras" };
        actionTag = "Área do Cliente";
      }
      // 5. SOBRE A HS DIGITAL E HUGO ROGÉRIO
      else if (
        q.includes("fundador") ||
        q.includes("criador") ||
        q.includes("dono") ||
        q.includes("quem fez") ||
        q.includes("hugo")
      ) {
        responseText =
          "A HS Digital foi fundada por Hugo Rogerio com a missão de conectar os melhores fornecedores nacionais e internacionais aos compradores brasileiros, oferecendo atendimento humanizado, preços justos e segurança total nas compras.";
        actionTag = "Fundador HS Digital";
      }
      // 6. FORMAS DE PAGAMENTO (PIX E CARTÃO)
      else if (
        q.includes("pix") ||
        q.includes("cartao") ||
        q.includes("cartão") ||
        q.includes("parcelar") ||
        q.includes("boleto") ||
        q.includes("pagar")
      ) {
        responseText =
          "Aceitamos Pix com aprovação imediata e envio prioritário, e cartão de crédito em até 10x sem juros ou 12x via Mercado Pago. Tudo rápido, criptografado e sem burocracia.";
        actionTag = "Pagamento Fácil";
      }
      // 7. PRODUTOS ESPECÍFICOS (SCANNER, ELETRÔNICOS, RELÓGIOS)
      else if (
        q.includes("scanner") ||
        q.includes("obd") ||
        q.includes("relogio") ||
        q.includes("smartwatch") ||
        q.includes("fone") ||
        q.includes("carro")
      ) {
        responseText =
          `Temos ótimas opções selecionadas desse tipo no nosso catálogo! Todos os produtos acompanham manual, especificações completas de fábrica e garantia de 30 dias. Quer dar uma olhada na vitrine com frete grátis?`;
        linkAction = { label: "Ver Produtos Disponíveis", url: "/" };
        actionTag = "Catálogo Oficial";
      }
      // 8. RESPOSTA HUMANIZADA E FLUIDA PADRÃO
      else {
        responseText =
          `Entendi perfeitamente sua dúvida sobre "${query}"! Como sua consultora, estou aqui para encontrar a melhor condição para você. Se quiser, posso te mostrar os produtos com frete grátis ou aplicar um cupom de desconto no seu carrinho agora mesmo.`;
        linkAction = { label: "Explorar Melhores Ofertas", url: "/" };
        actionTag = "Consultoria HS";
      }

      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: "aura",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(linkAction ? { link: linkAction } : {}),
        actionTag,
        couponCode,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 450);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir consultora Aura"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-[#3483fa] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Sparkles className="h-6 w-6 text-amber-200" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00a650]" />
            </span>
          </div>
        )}
      </button>

      {/* Janela de Atendimento Aura */}
      {isOpen && (
        <div className="fixed bottom-22 right-5 z-50 flex h-[540px] w-[370px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all sm:w-[400px]">
          {/* Header do Chat */}
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <AuraAvatar />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold">Aura</h3>
                  <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-200">
                    Atendente Oficial
                  </span>
                </div>
                <p className="text-[11px] text-gray-200 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#00a650] inline-block animate-pulse" />
                  Online • Responde em segundos
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                {m.actionTag && (
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#3483fa]">
                    {m.actionTag}
                  </span>
                )}
                
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                    m.sender === "user"
                      ? "bg-[#3483fa] text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Cartão de Cupom Integrado */}
                  {m.couponCode && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-2 text-xs">
                      <div className="flex items-center gap-1 text-[#00a650] font-bold">
                        <Gift className="h-4 w-4" />
                        <span>{m.couponCode}</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.couponCode!);
                          toast.success("Cupom copiado!");
                        }}
                        className="text-[10px] bg-[#00a650] text-white font-bold px-2 py-1 rounded"
                      >
                        Copiar
                      </button>
                    </div>
                  )}

                  {/* Ação com Link */}
                  {m.link && (
                    <Button
                      size="sm"
                      onClick={() => {
                        navigate({ to: m.link!.url });
                        setIsOpen(false);
                      }}
                      className="mt-2.5 w-full bg-[#3483fa] hover:bg-[#2968c8] text-white text-[11px] font-semibold h-7"
                    >
                      {m.link.label} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
                <span className="mt-1 text-[10px] text-gray-400 px-1">{m.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs italic">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                <span>Aura digitando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex gap-1.5 overflow-x-auto border-t bg-white px-3 py-2 text-[11px]">
            <button
              onClick={() => handleSend("Quero um cupom de frete grátis")}
              className="shrink-0 rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-[#00a650] font-semibold hover:bg-green-100"
            >
              🎁 Cupom Frete Grátis
            </button>
            <button
              onClick={() => handleSend("Como funciona o prazo de entrega?")}
              className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600 hover:bg-gray-100"
            >
              🚚 Prazos de envio
            </button>
            <button
              onClick={() => handleSend("O produto tem garantia de devolução?")}
              className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600 hover:bg-gray-100"
            >
              🛡️ Garantia de 30 dias
            </button>
          </div>

          {/* Campo de Entrada e Voz */}
          <div className="border-t bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isListening
                    ? "border-red-500 bg-red-50 text-red-500 animate-pulse"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
                title="Falar por voz"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Fale com a Aura ou tire sua dúvida..."
                className="h-9 text-xs bg-gray-50 border-gray-200"
              />

              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="h-9 w-9 shrink-0 bg-[#3483fa] hover:bg-[#2968c8] text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
