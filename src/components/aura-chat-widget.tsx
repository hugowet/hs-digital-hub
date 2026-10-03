import {
  ArrowRight,
  Gift,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  sender: "aura" | "user";
  text: string;
  time: string;
  url?: string;
  urlLabel?: string;
  actionTag?: string;
  couponCode?: string;
}

function AuraAvatar() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 text-white shadow-md">
      <Sparkles className="h-4 w-4 text-amber-200" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#00a650] shadow-sm" />
    </div>
  );
}

export function AuraChatWidget() {
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
        text: "Oi, tudo bem? Meu nome é Aura! 😊 Sou sua consultora na HS Digital. Como posso te ajudar hoje? Posso te passar cupons de frete grátis, rastrear seu pedido ou tirar dúvidas sobre qualquer produto!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionTag: "Atendente Oficial",
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  // Navegação segura sem quebrar o TanStack Router
  const handleNavigate = (targetUrl: string) => {
    setIsOpen(false);
    window.location.assign(targetUrl);
  };

  const toggleListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Aura ouvindo... Pode falar!", { duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
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
      let url: string | undefined;
      let urlLabel: string | undefined;
      let actionTag: string | undefined;
      let couponCode: string | undefined;

      // 1. Cupons e Frete Grátis
      if (
        q.includes("cupom") ||
        q.includes("desconto") ||
        q.includes("frete gratis") ||
        q.includes("frete grátis") ||
        q.includes("primeira compra")
      ) {
        responseText =
          "Você tem direito ao cupom oficial PRIMEIRACOMPRA para zerar o frete no seu carrinho hoje mesmo! 🎉";
        url = "/carrinho";
        urlLabel = "Ir para o Carrinho com Frete Grátis";
        actionTag = "Benefício Exclusivo";
        couponCode = "PRIMEIRACOMPRA";
      }
      // 2. Rastreio e Compras
      else if (
        q.includes("rastrear") ||
        q.includes("meu pedido") ||
        q.includes("minhas compras") ||
        q.includes("onde esta")
      ) {
        responseText =
          "Você pode acompanhar todos os detalhes e o código dos Correios na sua área de pedidos:";
        url = "/compras";
        urlLabel = "Ver Minhas Compras & Rastreio";
        actionTag = "Área do Cliente";
      }
      // 3. Minha Conta e Perfil
      else if (q.includes("perfil") || q.includes("cpf") || q.includes("minha conta") || q.includes("endereco")) {
        responseText =
          "Você pode editar sua foto, validar seu CPF oficial e cadastrar seus endereços na sua página de perfil:";
        url = "/conta";
        urlLabel = "Acessar Minha Conta";
        actionTag = "Configurações";
      }
      // 4. Vender na Loja
      else if (q.includes("vender") || q.includes("abrir loja") || q.includes("fornecedor")) {
        responseText =
          "Quer vender no HS Digital? Você pode cadastrar produtos, sincronizar com fornecedores e receber via Pix com taxa zero no 1º mês!";
        url = "/vendedor";
        urlLabel = "Abrir Painel do Vendedor";
        actionTag = "Parceria & Vendas";
      }
      // 5. Garantia e Confiança
      else if (q.includes("garantia") || q.includes("seguro") || q.includes("confiavel") || q.includes("reembolso")) {
        responseText =
          "Comprar aqui é 100% seguro! Seus pagamentos são processados pelo Mercado Pago e você tem 30 dias de garantia com devolução grátis.";
        actionTag = "Compra Protegida";
      }
      // 6. Resposta Padrão Fluida
      else {
        responseText =
          `Com certeza posso te ajudar com "${query}"! Como sua atendente pessoal, estou pronta para te orientar nas melhores ofertas e cupons da loja.`;
        url = "/";
        urlLabel = "Ver Ofertas em Destaque";
        actionTag = "Atendimento HS";
      }

      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: "aura",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        url,
        urlLabel,
        actionTag,
        couponCode,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 450);
  };

  return (
    <>
      {/* Botão Flutuante (Posicionamento Seguro bottom-20) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir consultora Aura"
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-[#3483fa] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
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

      {/* Janela de Atendimento Aura (bottom-24 fixa para nunca sobrepor) */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all sm:w-[390px]">
          {/* Header */}
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
                  Online agora
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

                  {/* Cupom Integrado */}
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
                        className="text-[10px] bg-[#00a650] text-white font-bold px-2 py-1 rounded hover:bg-[#008f45]"
                      >
                        Copiar
                      </button>
                    </div>
                  )}

                  {/* Botão de Redirecionamento Seguro */}
                  {m.url && m.urlLabel && (
                    <Button
                      size="sm"
                      onClick={() => handleNavigate(m.url!)}
                      className="mt-2.5 w-full bg-[#3483fa] hover:bg-[#2968c8] text-white text-[11px] font-semibold h-7"
                    >
                      {m.urlLabel} <ArrowRight className="h-3 w-3 ml-1" />
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
              onClick={() => handleSend("Como rastrear meu pedido?")}
              className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600 hover:bg-gray-100"
            >
              🚚 Rastrear Pedido
            </button>
            <button
              onClick={() => handleSend("Quero validar meu CPF")}
              className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600 hover:bg-gray-100"
            >
              🛡️ Validar CPF
            </button>
          </div>

          {/* Campo de Entrada */}
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
