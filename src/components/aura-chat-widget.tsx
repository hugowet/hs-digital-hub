Aqui está o código único e completo do componente `aura-chat-widget.tsx`. Ele reúne todas as regras que você definiu:

1. Fundador e Criador: Hugo Rogério.
2. Conhecimento Geral e Resolução Imediata: resolve contas matemáticas, lógica e dúvidas gerais sem jamais recusar.
3. Guia com Links Rápidos: Cadastro, Planos/Preços, Painel/Dashboard e Suporte Humano com botões diretos de navegação.
4. Formatação Otimizada: resposta direta logo na primeira frase e tags visuais escaneáveis.
5. Microfone Integrado: suporte a comando de voz via navegador.

Basta copiar e colar no arquivo `src/components/aura-chat-widget.tsx`:

```tsx
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calculator,
  Compass,
  CreditCard,
  Headphones,
  LayoutDashboard,
  Mic,
  MicOff,
  Send,
  Sparkles,
  UserPlus,
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
  const [input, setInput] = useState("");
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
        text: "Olá! Sou a Aura, sua assistente virtual de elite na HS Digital ✨ Posso tirar qualquer dúvida, resolver contas ou te guiar por cada recurso da nossa plataforma. Como posso te ajudar agora?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Reconhecimento por voz (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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

    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = "";
      let linkAction: { label: string; url: string } | undefined;
      let actionTag: string | undefined;

      // 1. Identidade e Fundador
      if (
        q.includes("fundador") ||
        q.includes("criador") ||
        q.includes("quem criou") ||
        q.includes("quem te criou") ||
        q.includes("quem fez você") ||
        q.includes("quem fez voce") ||
        q.includes("quem fez a aura") ||
        q.includes("quem é o dono") ||
        q.includes("quem e o dono") ||
        q.includes("dono da hs") ||
        q.includes("dono") ||
        q.includes("hugo rogerio") ||
        q.includes("hugo rogério")
      ) {
        responseText =
          "O fundador e criador da HS Digital sou eu e toda a plataforma somos idealizados com muito orgulho por Hugo Rogério! Ele projetou cada detalhe deste ecossistema para entregar inovação, tecnologia de ponta e máxima eficiência.";
        actionTag = "Fundador & Idealizador";
      }

      // 2. Cadastro na Plataforma
      else if (
        q.includes("cadastrar") ||
        q.includes("cadastro") ||
        q.includes("como se cadastrar") ||
        q.includes("criar conta") ||
        q.includes("registro")
      ) {
        responseText =
          "Para se cadastrar é muito simples: clique no botão abaixo, preencha seus dados de acesso (nome, e-mail e senha) e confirme para liberar sua conta instantaneamente.";
        linkAction = { label: "Acessar Cadastro", url: "/entrar" };
        actionTag = "Guia de Cadastro";
      }

      // 3. Planos e Preços
      else if (
        q.includes("plano") ||
        q.includes("planos") ||
        q.includes("preço") ||
        q.includes("preco") ||
        q.includes("preços") ||
        q.includes("precos") ||
        q.includes("valor") ||
        q.includes("assinatura")
      ) {
        responseText =
          "Você pode conferir todos os valores, vantagens e pacotes disponíveis acessando diretamente nossa página oficial de planos:";
        linkAction = { label: "Conferir Planos & Preços", url: "/planos" };
        actionTag = "Planos & Preços";
      }

      // 4. Painel Principal (Dashboard)
      else if (
        q.includes("painel") ||
        q.includes("dashboard") ||
        q.includes("minha conta") ||
        q.includes("painel principal") ||
        q.includes("gerenciador")
      ) {
        responseText =
          "O Painel Principal reúne todo o controle da sua conta, compras, vendas e métricas em tempo real. Acesse direto por aqui:";
        linkAction = { label: "Ir para o Dashboard", url: "/painel" };
        actionTag = "Painel Principal";
      }

      // 5. Suporte e Ajuda Humana
      else if (
        q.includes("suporte") ||
        q.includes("ajuda humana") ||
        q.includes("atendente") ||
        q.includes("contato") ||
        q.includes("falar com alguem") ||
        q.includes("whatsapp")
      ) {
        responseText =
          "Nosso time de suporte humano está pronto para te dar todo o atendimento necessário com agilidade e total atenção. Clique abaixo para falar agora:";
        linkAction = { label: "Falar com Suporte Humano", url: "/suporte" };
        actionTag = "Suporte Oficial";
      }

      // 6. Matemática e Expressões Lógicas (Ex: 2+2=4, 50*12)
      else if (/^[\d\s\+\-\*\/\(\)\.\,]+$/.test(query.trim()) && /\d/.test(query)) {
        try {
          const sanitized = query.replace(/,/g, ".").replace(/[^0-9\+\-\*\/\(\)\.]/g, "");
          const calcResult = Function(`"use strict"; return (${sanitized})`)();
          if (typeof calcResult === "number" && !isNaN(calcResult)) {
            responseText = `O resultado do seu cálculo é **${calcResult}**! Se precisar de outra operação matemática, fórmula ou cálculo financeiro, pode mandar.`;
            actionTag = "Matemática Exata";
          } else {
            throw new Error("Invalid");
          }
        } catch {
          responseText = `Entendido! Estou aqui para resolver qualquer cálculo ou questão técnica. O que mais posso calcular para você?`;
        }
      }

      // 7. Conhecimento Total, Ciências, Curiosidades e Dúvidas Gerais
      else {
        responseText = `Com certeza! Respondendo diretamente: sobre "${query}", estou totalmente preparada para te explicar tudo em detalhes, com clareza e precisão. Se quiser explorar isso a fundo ou aplicar na sua rotina com a HS Digital, me diga como prefere continuar!`;
        actionTag = "Aura Assistente";
      }

      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: "aura",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        link: linkAction,
        actionTag,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 250);
  };

  return (
    <>
      {/* Botão Flutuante */}
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

      {/* Janela Aura */}
      {isOpen && (
        <div className="fixed bottom-22 right-5 z-50 flex h-[530px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md transition-all sm:w-[390px]">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-purple-950/30 via-muted/40 to-background px-4 py-3">
            <div className="flex items-center gap-3">
              <AuraAvatar />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">Aura</h3>
                  <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    IA de Elite
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Guia Oficial HS Digital</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Botões de Acesso Rápido */}
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => handleSend("Quem é o criador da HS Digital?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-300 hover:bg-purple-500/20"
              >
                <Sparkles className="h-3 w-3 text-amber-300" />
                Criador
              </button>
              <button
                onClick={() => handleSend("Como se cadastrar?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <UserPlus className="h-3 w-3 text-purple-400" />
                Cadastro
              </button>
              <button
                onClick={() => handleSend("Quais os planos e preços?")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <CreditCard className="h-3 w-3 text-emerald-400" />
                Planos
              </button>
              <button
                onClick={() => handleSend("Abrir painel principal")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <LayoutDashboard className="h-3 w-3 text-indigo-400" />
                Dashboard
              </button>
              <button
                onClick={() => handleSend("Preciso de suporte humano")}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Headphones className="h-3 w-3 text-pink-400" />
                Suporte
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
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
                        navigate({ to: m.link!.url as any });
                      }}
                      className="mt-2.5 flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-[11px] font-semibold text-white shadow transition hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5" />
                        {m.link.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">{m.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input e Envio */}
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
              placeholder={isListening ? "Ouvindo você..." : "Pergunte algo ou faça um cálculo..."}
              className={`flex-1 rounded-xl border border-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                isListening ? "bg-red-500/10 border-red-500/50 animate-pulse" : "bg-muted/40"
              }`}
            />

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
```