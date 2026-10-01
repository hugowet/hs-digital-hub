import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleHelp,
  Package,
  Send,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  sender: "aura" | "user";
  text: string;
  time: string;
  link?: { label: string; url: string };
}

function AuraAvatar() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 text-white shadow-md">
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
    </div>
  );
}

export function AuraChatWidget() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: "welcome",
        sender: "aura",
        text: "Olá! Sou a Aura, sua assistente virtual no HS Digital. Como posso te orientar hoje?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

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

    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = "";
      let linkAction: { label: string; url: string } | undefined;

      if (
        q.includes("fundador") ||
        q.includes("criador") ||
        q.includes("quem criou") ||
        q.includes("quem fez") ||
        q.includes("dono") ||
        q.includes("proprietario") ||
        q.includes("hugo")
      ) {
        responseText = "A plataforma HS Digital foi fundada e criada por Hugo Rogerio, com o objetivo de oferecer uma experiência moderna, rápida e segura de marketplace.";
      } else if (q.includes("meus pedidos") || q.includes("compras") || q.includes("rastrear") || q.includes("onde ta meu pedido")) {
        responseText = "Você pode acompanhar o status de entrega, conciliação de pagamento e histórico de todos os seus pedidos na aba Minhas Compras.";
        linkAction = { label: "Ir para Minhas Compras", url: "/compras" };
      } else if (q.includes("carrinho") || q.includes("finalizar") || q.includes("checkout")) {
        responseText = "Seus itens selecionados ficam salvos no carrinho por loja. Você pode revisar endereços e escolher frete rápido.";
        linkAction = { label: "Ver meu Carrinho", url: "/carrinho" };
      } else if (q.includes("vender") || q.includes("vendedor") || q.includes("loja") || q.includes("cadastrar produto")) {
        responseText = "Você pode criar sua própria loja e anunciar produtos físicos ou digitais no Painel do Vendedor da HS Digital.";
        linkAction = { label: "Acessar Painel do Vendedor", url: "/vendedor" };
      } else if (q.includes("pagamento") || q.includes("pix") || q.includes("cartao") || q.includes("parcelamento")) {
        responseText = "Aceitamos Pix com aprovação imediata e cartão de crédito com parcelamento seguro processado via Mercado Pago.";
      } else if (q.includes("digital") || q.includes("ebook") || q.includes("curso") || q.includes("download")) {
        responseText = "Para produtos digitais, o link para download é liberado automaticamente na sua tela de compras logo após a aprovação do pagamento.";
        linkAction = { label: "Ver Minhas Compras", url: "/compras" };
      } else {
        responseText = "Posso te ajudar a navegar pelo marketplace, tirar dúvidas sobre pedidos, pagamentos e como começar a vender!";
      }

      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: "aura",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        link: linkAction,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 450);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir suporte com Aura"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Sparkles className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500" />
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-22 right-5 z-50 flex h-[500px] w-[350px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md transition-all sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <AuraAvatar />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">Aura</h3>
                  <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                    IA Suporte
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Assistente HS Digital</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => handleSend("Onde vejo minhas compras?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Package className="h-3 w-3 text-purple-400" />
                Minhas Compras
              </button>
              <button
                onClick={() => handleSend("Como faço para vender?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Store className="h-3 w-3 text-indigo-400" />
                Seja Vendedor
              </button>
              <button
                onClick={() => handleSend("Quais as formas de pagamento?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <CircleHelp className="h-3 w-3 text-pink-400" />
                Pagamento
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/80 text-foreground border border-border/50 rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.link && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate({ to: m.link.url as any });
                      }}
                      className="mt-2 flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-purple-700"
                    >
                      {m.link.label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">{m.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

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
              placeholder="Pergunte à Aura..."
              className="flex-1 rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
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
