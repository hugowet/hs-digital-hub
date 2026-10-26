import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircleHelp, Loader2, Mic, MicOff, Package, Send, ShoppingBag, Sparkles, Store, Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { askAura } from "@/lib/aura-chat.functions";

interface Message {
  id: string;
  sender: "aura" | "user";
  text: string;
  time: string;
  link?: { label: string; url: string };
  actionTag?: string;
}

function AuraAvatar() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 text-white shadow-md">
      <Sparkles className="h-4 w-4 animate-pulse text-amber-200" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
    </div>
  );
}

export function AuraChatWidget() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: "welcome",
        sender: "aura",
        text: "Olá! Sou a Aura, sua consultora inteligente no HS Digital ✨ Estou aqui para encontrar as melhores ofertas, orientar suas compras e te levar direto ao que você precisa. O que você procura hoje?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isThinking]);

  // Função do Microfone (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz direto. Digite sua dúvida!");
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
        toast.info("Aura ouvindo... Pode falar!", { duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  if (!mounted) return null;

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isThinking) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: query,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");

    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = "";
      let linkAction: { label: string; url: string } | undefined;
      let actionTag: string | undefined;

      // Respostas sobre Criador / Fundador / Criação da IA e da HS Digital
      if (
        q.includes("fundador") ||
        q.includes("criador") ||
        q.includes("quem criou") ||
        q.includes("quem te criou") ||
        q.includes("quem fez você") ||
        q.includes("quem fez voce") ||
        q.includes("quem fez a aura") ||
        q.includes("quem inventou") ||
        q.includes("dono") ||
        q.includes("proprietario") ||
        q.includes("hugo")
      ) {
        responseText =
          "Tanto a plataforma HS Digital quanto eu, a Aura, fomos idealizados e criados por Hugo Rogério, nosso fundador! Ele projetou cada detalhe desse ecossistema para oferecer tecnologia de ponta, segurança máxima e a melhor experiência de compras e vendas online.";
        actionTag = "Fundador & Idealizador";
      }
      // Dúvidas de Compras / Rastreio / Pedidos
      else if (
        q.includes("meus pedidos") ||
        q.includes("minhas compras") ||
        q.includes("rastrear") ||
        q.includes("onde esta meu pedido") ||
        q.includes("pedido")
      ) {
        responseText =
          "Você tem total controle! Na sua aba 'Minhas Compras', você acompanha a aprovação, o código de rastreio e acessa downloads imediatos caso tenha comprado itens digitais. Vamos até lá?";
        linkAction = { label: "Acessar Minhas Compras", url: "/compras" };
        actionTag = "Área do Cliente";
      }
      // Carrinho e Checkout
      else if (
        q.includes("carrinho") ||
        q.includes("finalizar") ||
        q.includes("checkout") ||
        q.includes("comprar agora")
      ) {
        responseText =
          "Seus produtos selecionados estão salvos! Não deixe para depois, pois as ofertas da semana têm estoque limitado e garantem frete especial por loja. Vamos fechar seu pedido com compra 100% protegida?";
        linkAction = { label: "Ir para o Carrinho", url: "/carrinho" };
        actionTag = "Finalizar Pedido";
      }
      // Vender na HS Digital
      else if (
        q.includes("vender") ||
        q.includes("vendedor") ||
        q.includes("abrir loja") ||
        q.includes("anunciar") ||
        q.includes("cadastrar produto")
      ) {
        responseText =
          "Quer faturar na HS Digital? É uma oportunidade incrível! Você pode cadastrar produtos físicos ou digitais, receber via Mercado Pago e alcançar milhares de compradores com taxas super competitivas.";
        linkAction = { label: "Abrir Painel do Vendedor", url: "/vendedor" };
        actionTag = "Ganhe Dinheiro Conosco";
      }
      // Formas de Pagamento e Segurança
      else if (
        q.includes("pagamento") ||
        q.includes("pix") ||
        q.includes("cartao") ||
        q.includes("parcelar") ||
        q.includes("seguro") ||
        q.includes("confiavel")
      ) {
        responseText =
          "Sua compra é totalmente segura e blindada! Aceitamos Pix com liberação imediata e cartão de crédito em até 12x via Mercado Pago. Seus dados são criptografados e o pagamento só é repassado ao vendedor com garantia de entrega!";
        actionTag = "Compra 100% Protegida";
      }
      // Cursos e Infoprodutos
      else if (q.includes("curso") || q.includes("infoproduto") || q.includes("aprender") || q.includes("aula")) {
        responseText =
          "Temos uma seleção imperdível de cursos e infoprodutos práticos para acelerar seus conhecimentos com acesso imediato após a confirmação. Dê uma olhada nos mais recomendados!";
        linkAction = { label: "Ver Cursos & Infoprodutos", url: "/?category=cursos-infoprodutos" };
        actionTag = "Educação & Alta Performance";
      }
      // Produtos Digitais e Templates
      else if (
        q.includes("digital") ||
        q.includes("ebook") ||
        q.includes("template") ||
        q.includes("planilha") ||
        q.includes("download")
      ) {
        responseText =
          "Praticidade máxima! Nossos produtos digitais e templates têm entrega automática em segundos. Você adquire e já começa a usar na hora sem pagar nada de frete!";
        linkAction = { label: "Explorar Produtos Digitais", url: "/?category=digitais-templates" };
        actionTag = "Download Imediato";
      }
      // Eletrônicos, Gadgets e Acessórios
      else if (
        q.includes("celular") ||
        q.includes("eletronico") ||
        q.includes("gadget") ||
        q.includes("teclado") ||
        q.includes("fone") ||
        q.includes("computador")
      ) {
        responseText =
          "Temos gadgets modernos e periféricos de alta performance com ótimas condições de frete e procedência garantida. Confira os destaques tecnológicos!";
        linkAction = { label: "Ver Eletrônicos & Periféricos", url: "/?category=eletronicos-gadgets" };
        actionTag = "Tecnologia de Ponta";
      }
      // Login e Conta
      else if (q.includes("login") || q.includes("entrar") || q.includes("minha conta") || q.includes("cadastro")) {
        responseText =
          "Acesse sua conta para conferir seus cupons exclusivos, histórico de transações e promoções personalizadas:";
        linkAction = { label: "Fazer Login / Cadastrar", url: "/auth" };
        actionTag = "Acesso Rápido";
      }
      // Resposta persuasiva padrão
      else {
        responseText = "";
      }

      if (responseText) {
        const botMsg: Message = {
          id: String(Date.now() + 1),
          sender: "aura",
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ...(linkAction ? { link: linkAction } : {}),
          actionTag,
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Sem intenção rápida correspondente: consulta a IA da Aura.
      setIsThinking(true);
      const history = messages
        .slice(-8)
        .map((m) => ({ role: m.sender === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));
      askAura({ data: { message: query, history } })
        .then(({ reply }) => {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "aura",
              text: reply,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              actionTag: "Consultora IA",
            },
          ]);
        })
        .catch((err) => {
          console.error("Erro na Aura:", err);
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "aura",
              text: "Tive uma instabilidade agora, mas já estou de volta! Pode repetir sua pergunta?",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        })
        .finally(() => setIsThinking(false));
    }, 400);
  };

  return (
    <>
      {/* Botão Flutuante da Aura */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir consultora Aura"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Sparkles className="h-6 w-6 text-amber-200" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500" />
            </span>
          </div>
        )}
      </button>

      {/* Janela de Atendimento Aura */}
      {isOpen && (
        <div className="fixed bottom-22 right-5 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md transition-all sm:w-[390px]">
          {/* Topo do Chat */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-purple-950/30 via-muted/40 to-background px-4 py-3">
            <div className="flex items-center gap-3">
              <AuraAvatar />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">Aura</h3>
                  <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    Consultora IA
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Especialista HS Digital</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Atalhos Rápidos com persuasão de vendas */}
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => handleSend("Quais as melhores ofertas?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-300 hover:bg-purple-500/20"
              >
                <Tag className="h-3 w-3" />
                Ofertas da Semana
              </button>
              <button
                onClick={() => handleSend("Onde vejo minhas compras?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Package className="h-3 w-3 text-purple-400" />
                Minhas Compras
              </button>
              <button
                onClick={() => handleSend("Como posso vender no site?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Store className="h-3 w-3 text-indigo-400" />
                Seja Vendedor
              </button>
              <button
                onClick={() => handleSend("Como funciona o pagamento?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <CircleHelp className="h-3 w-3 text-pink-400" />
                Pagamento Seguro
              </button>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none font-medium"
                      : "bg-muted/90 text-foreground border border-border/60 rounded-bl-none"
                  }`}
                >
                  {m.actionTag && (
                    <span className="mb-1 inline-block rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300">
                      {m.actionTag}
                    </span>
                  )}
                  <p>{m.text}</p>
                  {m.link && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        if (m.link!.url.includes("?")) {
                          const [path, searchStr] = m.link!.url.split("?");
                          const params = Object.fromEntries(new URLSearchParams(searchStr));
                          navigate({ to: path as any, search: params as any });
                        } else {
                          navigate({ to: m.link!.url as any });
                        }
                      }}
                      className="mt-2.5 flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-[11px] font-semibold text-white shadow transition hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {m.link.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">{m.time}</span>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AuraAvatar />
                <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-border/60 bg-muted/90 px-3.5 py-2.5 text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                  Aura está pensando...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Envio com Microfone */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border bg-background p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Ouvindo você..." : "Pergunte ou use o microfone..."}
              className={`flex-1 rounded-xl border border-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                isListening ? "bg-red-500/10 border-red-500/50 animate-pulse" : "bg-muted/40"
              }`}
            />

            {/* Botão de Microfone */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Parar de ouvir" : "Falar no microfone"}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                isListening
                  ? "bg-red-600 text-white animate-bounce shadow-md shadow-red-500/50"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Botão de Enviar */}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
