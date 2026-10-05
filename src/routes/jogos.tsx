import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Gamepad2,
  Sparkles,
  Trophy,
  RotateCcw,
  Copy,
  Check,
  ArrowLeft,
  Flame,
  Gift,
  Clock,
  Maximize2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/jogos")({
  component: JogosPage,
});

export default function JogosPage() {
  const [activeTab, setActiveTab] = useState<"roleta" | "raspadinha" | "cobrinha">("roleta");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom ${code} copiado! Use antes de expirar.`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Gamepad2 className="h-6 w-6" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Arena de Recompensas HS</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gire a roleta diária, raspe o bilhete ou bata o recorde na cobrinha para destravar cupons exclusivos!
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-center">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar às Compras
            </Link>
          </Button>
        </div>

        {/* NAVEGAÇÃO ENTRE OS JOGOS */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={activeTab === "roleta" ? "default" : "outline"}
            className="flex items-center justify-center gap-2 h-12 text-xs sm:text-sm font-bold"
            onClick={() => setActiveTab("roleta")}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Roleta Diária</span>
          </Button>
          <Button
            variant={activeTab === "raspadinha" ? "default" : "outline"}
            className="flex items-center justify-center gap-2 h-12 text-xs sm:text-sm font-bold"
            onClick={() => setActiveTab("raspadinha")}
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span>Raspadinha</span>
          </Button>
          <Button
            variant={activeTab === "cobrinha" ? "default" : "outline"}
            className="flex items-center justify-center gap-2 h-12 text-xs sm:text-sm font-bold"
            onClick={() => setActiveTab("cobrinha")}
          >
            <Flame className="h-4 w-4 shrink-0 text-orange-500" />
            <span>Cobrinha Arcade</span>
          </Button>
        </div>

        {/* ÁREA PRINCIPAL DO JOGO */}
        <div className="bg-card border rounded-2xl p-3 sm:p-6 shadow-xs flex flex-col items-center justify-center min-h-[460px]">
          {activeTab === "roleta" && <RoletaGame onCopyCoupon={copyCoupon} copiedCode={copiedCode} />}
          {activeTab === "raspadinha" && <RaspadinhaGame onCopyCoupon={copyCoupon} copiedCode={copiedCode} />}
          {activeTab === "cobrinha" && <CobrinhaGame onCopyCoupon={copyCoupon} />}
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// 1. ROLETA COM LIMITE DE 1 GIRO POR DIA E CHANCES REAIS
// ----------------------------------------------------
function RoletaGame({ onCopyCoupon, copiedCode }: { onCopyCoupon: (c: string) => void; copiedCode: string | null }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; coupon?: string; minOrder?: string } | null>(null);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(false);
  const [timeToNextSpin, setTimeToNextSpin] = useState("");

  const STORAGE_KEY = "hs_roleta_last_spin";

  // FATIAS DA ROLETA (6 fatias de 60 graus)
  const slices = [
    { label: "5% OFF", coupon: "HSSORTE5", minOrder: "R$ 50", weight: 40 },
    { label: "Tente Amanhã", coupon: undefined, weight: 30 },
    { label: "10% OFF", coupon: "HSEXTREMO10", minOrder: "R$ 99", weight: 12 },
    { label: "Quase!", coupon: undefined, weight: 15 },
    { label: "15% OFF VIP", coupon: "HSVIP15", minOrder: "R$ 150", weight: 3 },
  ];

  useEffect(() => {
    const checkLimit = () => {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        const lastDate = new Date(parseInt(last, 10));
        const now = new Date();
        const isSameDay =
          lastDate.getDate() === now.getDate() &&
          lastDate.getMonth() === now.getMonth() &&
          lastDate.getFullYear() === now.getFullYear();

        if (isSameDay) {
          setAlreadyPlayedToday(true);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          const diffMs = endOfDay.getTime() - now.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeToNextSpin(`${hours}h ${mins}m`);
          return;
        }
      }
      setAlreadyPlayedToday(false);
    };

    checkLimit();
    const interval = setInterval(checkLimit, 60000);
    return () => clearInterval(interval);
  }, []);

  const spin = () => {
    if (spinning || alreadyPlayedToday) return;

    setSpinning(true);
    setResult(null);

    // SORTEIO PONDERADO (A CASA CONTROLA A PROBABILIDADE)
    const randomPercent = Math.random() * 100;
    let accumulated = 0;
    let chosenIndex = 1; // Default "Tente Amanhã"

    for (let i = 0; i < slices.length; i++) {
      accumulated += slices[i].weight;
      if (randomPercent <= accumulated) {
        chosenIndex = i;
        break;
      }
    }

    const degreesPerSlice = 360 / slices.length;
    const extraSpins = 6;
    const finalAngle = rotation + extraSpins * 360 + (slices.length - chosenIndex) * degreesPerSlice;

    setRotation(finalAngle);

    setTimeout(() => {
      setSpinning(false);
      const prize = slices[chosenIndex];
      setResult(prize);
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setAlreadyPlayedToday(true);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-sm w-full">
      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 text-red-600 font-bold text-3xl drop-shadow-md">
          ▼
        </div>

        <div
          className="w-full h-full rounded-full border-4 border-primary shadow-2xl overflow-hidden transition-all duration-[4000ms] cubic-bezier(0.15, 0.9, 0.2, 1) flex items-center justify-center relative"
          style={{
            transform: `rotate(${rotation}deg)`,
            background:
              "conic-gradient(#f97316 0deg 72deg, #3b82f6 72deg 144deg, #10b981 144deg 216deg, #8b5cf6 216deg 288deg, #ef4444 288deg 360deg)",
          }}
        >
          <div className="w-20 h-20 bg-background rounded-full border-4 border-primary flex items-center justify-center font-bold text-xs uppercase tracking-wider shadow-inner text-foreground">
            HS Sorte
          </div>
        </div>
      </div>

      {alreadyPlayedToday ? (
        <div className="bg-muted p-4 rounded-xl border w-full flex flex-col items-center space-y-2">
          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
            <Lock className="h-4 w-4" />
            <span>Giro diário já realizado hoje!</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Próximo giro liberado em:{" "}
            <strong className="text-foreground">{timeToNextSpin}</strong>
          </p>
        </div>
      ) : (
        <Button size="lg" onClick={spin} disabled={spinning} className="font-bold w-full max-w-xs shadow-md">
          {spinning ? "Girando a Roleta..." : "Girar Roleta Grátis (1x ao dia)"}
        </Button>
      )}

      {result && (
        <div className="bg-card p-4 rounded-xl border-2 border-primary/40 w-full animate-in fade-in zoom-in duration-300 shadow-md">
          <p className="text-sm font-semibold text-foreground">
            Resultado: <strong className="text-primary">{result.label}</strong>
          </p>
          {result.coupon ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between gap-2 bg-muted p-2 rounded-lg border">
                <span className="font-mono font-black text-primary text-base tracking-widest">{result.coupon}</span>
                <Button size="sm" variant="ghost" onClick={() => onCopyCoupon(result.coupon!)}>
                  {copiedCode === result.coupon ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Válido para pedidos acima de {result.minOrder} nas próximas 2 horas!
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Não foi dessa vez! Volte amanhã para tentar novamente.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 2. RASPADINHA (1 VEZ AO DIA COM CHANCES CONTROLADAS)
// ----------------------------------------------------
function RaspadinhaGame({
  onCopyCoupon,
  copiedCode,
}: {
  onCopyCoupon: (c: string) => void;
  copiedCode: string | null;
}) {
  const [scratched, setScratched] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [prize, setPrize] = useState<{ coupon?: string; label: string; min?: string }>({ label: "Sem prêmio" });

  const STORAGE_KEY = "hs_raspadinha_last_played";

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last) {
      const lastDate = new Date(parseInt(last, 10));
      const now = new Date();
      if (
        lastDate.getDate() === now.getDate() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getFullYear() === now.getFullYear()
      ) {
        setAlreadyPlayed(true);
      }
    }
  }, []);

  const handleScratch = () => {
    if (scratched || alreadyPlayed) return;

    // Sorteio: 60% chance de não ganhar nada, 35% de ganhar 5% OFF, 5% de ganhar 10%
    const rand = Math.random();
    if (rand < 0.6) {
      setPrize({ label: "Quase! Raspadinha sem prêmio hoje." });
    } else if (rand < 0.95) {
      setPrize({ label: "5% DE DESCONTO", coupon: "RASPA5", min: "R$ 49" });
    } else {
      setPrize({ label: "10% DE DESCONTO", coupon: "RASPASORTE10", min: "R$ 89" });
    }

    setScratched(true);
    setAlreadyPlayed(true);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  return (
    <div className="flex flex-col items-center text-center space-y-4 max-w-sm w-full">
      <div className="space-y-1">
        <h3 className="font-bold text-lg">Raspadinha Premiada HS</h3>
        <p className="text-xs text-muted-foreground">
          {alreadyPlayed
            ? "Você já raspou seu bilhete de hoje!"
            : "Toque na área cinza para revelar seu benefício diário"}
        </p>
      </div>

      <div
        onClick={handleScratch}
        className="w-full h-44 rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center p-4 cursor-pointer relative overflow-hidden select-none bg-accent/20"
      >
        {!scratched ? (
          <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-700 flex flex-col items-center justify-center gap-2 text-foreground font-bold transition-opacity hover:opacity-95">
            <Gift className="h-8 w-8 text-primary animate-bounce" />
            <span>{alreadyPlayed ? "Bilhete esgotado por hoje" : "Toque aqui para raspar"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 animate-in fade-in duration-500">
            <span className="text-xs text-muted-foreground uppercase font-bold">{prize.label}</span>
            {prize.coupon ? (
              <>
                <span className="text-2xl font-black font-mono text-primary tracking-widest">{prize.coupon}</span>
                <p className="text-[10px] text-muted-foreground">Pedido mínimo {prize.min}</p>
                <Button size="sm" variant="secondary" className="mt-1" onClick={() => onCopyCoupon(prize.coupon!)}>
                  {copiedCode === prize.coupon ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copiar Cupom
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Volte amanhã para raspar um novo bilhete!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3. COBRINHA ARCADE (TELA CHEIA, SWIPE NO CELULAR E VÍCIO)
// ----------------------------------------------------
function CobrinhaGame({ onCopyCoupon }: { onCopyCoupon: (c: string) => void }) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [food, setFood] = useState<{ x: number; y: number; isGold?: boolean }>({ x: 15, y: 10 });
  const [dir, setDir] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tamanho do grid dinâmico
  const cols = 22;
  const rows = 18;

  // Touch touch/swipe handlers
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("hs_snake_highscore");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const resetGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    setFood({ x: 15, y: 10, isGold: false });
    setDir("RIGHT");
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    // Velocidade progressiva: acelera conforme pontua
    const speed = Math.max(75, 140 - Math.floor(score / 15) * 8);

    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] };
        if (dir === "UP") head.y -= 1;
        if (dir === "DOWN") head.y += 1;
        if (dir === "LEFT") head.x -= 1;
        if (dir === "RIGHT") head.x += 1;

        // Bateu na parede
        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
          handleGameOver();
          return prev;
        }

        // Bateu no próprio corpo
        for (const segment of prev) {
          if (segment.x === head.x && segment.y === head.y) {
            handleGameOver();
            return prev;
          }
        }

        const newSnake = [head, ...prev];

        // Comeu a fruta
        if (head.x === food.x && head.y === food.y) {
          const pointsEarned = food.isGold ? 30 : 10;
          setScore((s) => {
            const next = s + pointsEarned;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem("hs_snake_highscore", next.toString());
            }
            return next;
          });

          // 20% de chance de fruta dourada especial
          const isGold = Math.random() < 0.2;
          setFood({
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows),
            isGold,
          });
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [dir, isPlaying, gameOver, food, score, highScore]);

  const handleGameOver = () => {
    setGameOver(true);
    setIsPlaying(false);
  };

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && dir !== "DOWN") setDir("UP");
      if (e.key === "ArrowDown" && dir !== "UP") setDir("DOWN");
      if (e.key === "ArrowLeft" && dir !== "RIGHT") setDir("LEFT");
      if (e.key === "ArrowRight" && dir !== "LEFT") setDir("RIGHT");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dir]);

  // Gestos de deslizar o dedo (Swipe) no celular
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30 && dir !== "LEFT") setDir("RIGHT");
      else if (dx < -30 && dir !== "RIGHT") setDir("LEFT");
    } else {
      if (dy > 30 && dir !== "UP") setDir("DOWN");
      else if (dy < -30 && dir !== "DOWN") setDir("UP");
    }
    touchStartRef.current = null;
  };

  return (
    <div className="flex flex-col items-center space-y-3 w-full max-w-3xl">
      {/* PLACAR */}
      <div className="flex items-center justify-between w-full px-3 py-2 bg-muted/60 rounded-xl border">
        <div className="flex items-center gap-4">
          <span className="font-black text-sm sm:text-base">
            Pontos: <span className="text-primary">{score}</span>
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Recorde: {highScore}
          </span>
        </div>
        {score >= 100 && (
          <span className="text-xs bg-green-500/10 text-green-600 font-bold px-2.5 py-1 rounded-md animate-pulse">
            Cupom Liberado: COBRINHA100
          </span>
        )}
      </div>

      {/* ÁREA DO JOGO (FULL WIDTH RESPONSIVO COM SUPORTE A SWIPE) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full h-[320px] sm:h-[420px] bg-zinc-950 rounded-2xl relative border-2 border-primary/30 overflow-hidden shadow-inner touch-none"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {snake.map((seg, i) => (
          <div
            key={i}
            className={`rounded-xs transition-all ${
              i === 0 ? "bg-emerald-400 ring-2 ring-emerald-300" : "bg-emerald-500/80"
            }`}
            style={{ gridColumnStart: seg.x + 1, gridRowStart: seg.y + 1 }}
          />
        ))}

        <div
          className={`rounded-full animate-bounce shadow-lg ${
            food.isGold ? "bg-amber-400 ring-2 ring-amber-200" : "bg-red-500 ring-2 ring-red-400"
          }`}
          style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }}
        />

        {/* TELA DE INÍCIO / GAME OVER */}
        {(!isPlaying || gameOver) && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in">
            {gameOver ? (
              <>
                <p className="text-red-400 font-black text-2xl tracking-tight">Fim de Jogo!</p>
                <p className="text-white/80 text-sm mt-1 mb-4">Você fez {score} pontos!</p>

                {score >= 100 ? (
                  <div className="mb-4 bg-muted/20 border border-green-500/40 p-3 rounded-xl max-w-xs">
                    <p className="text-green-400 text-xs font-bold mb-2">Parabéns! Meta batida!</p>
                    <Button size="sm" variant="secondary" onClick={() => onCopyCoupon("COBRINHA100")}>
                      Copiar Cupom 5% OFF (Min R$ 40)
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 mb-4">Alcance 100 pontos para desbloquear um cupom exclusivo!</p>
                )}
              </>
            ) : (
              <>
                <Flame className="h-10 w-10 text-orange-500 mb-2 animate-bounce" />
                <h3 className="text-white font-black text-xl">Cobrinha Arcade HS</h3>
                <p className="text-zinc-400 text-xs mt-1 mb-4 max-w-xs">
                  Deslize o dedo na tela do celular ou use as setas do teclado. Faça 100 pontos e ganhe desconto!
                </p>
              </>
            )}

            <Button size="lg" className="font-bold px-8" onClick={resetGame}>
              {gameOver ? "Jogar Novamente" : "Começar Agora"}
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Dica: Deslize o dedo em qualquer direção na tela para virar a cobrinha rapidamente.
      </p>
    </div>
  );
}
