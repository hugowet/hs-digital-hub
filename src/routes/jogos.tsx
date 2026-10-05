import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Gamepad2, Sparkles, Trophy, RotateCcw, Copy, Check, ArrowLeft, Flame, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/jogos")({
  component: JogosPage,
});

export default function JogosPage() {
  const [activeTab, setActiveTab] = useState<"roleta" | "raspadinha" | "cobrinha" | "2048">("roleta");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom ${code} copiado com sucesso!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Gamepad2 className="h-6 w-6" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Arena de Jogos HS Digital</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Jogue para passar o tempo e ganhe cupons de desconto reais para usar em suas compras!
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-center">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar à Loja
            </Link>
          </Button>
        </div>

        {/* Abas dos Jogos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            variant={activeTab === "roleta" ? "default" : "outline"}
            className="flex items-center gap-2 h-12"
            onClick={() => setActiveTab("roleta")}
          >
            <Sparkles className="h-4 w-4" />
            <span>Roleta da Sorte</span>
          </Button>
          <Button
            variant={activeTab === "raspadinha" ? "default" : "outline"}
            className="flex items-center gap-2 h-12"
            onClick={() => setActiveTab("raspadinha")}
          >
            <Gift className="h-4 w-4" />
            <span>Raspadinha</span>
          </Button>
          <Button
            variant={activeTab === "cobrinha" ? "default" : "outline"}
            className="flex items-center gap-2 h-12"
            onClick={() => setActiveTab("cobrinha")}
          >
            <Flame className="h-4 w-4" />
            <span>Cobrinha</span>
          </Button>
          <Button
            variant={activeTab === "2048" ? "default" : "outline"}
            className="flex items-center gap-2 h-12"
            onClick={() => setActiveTab("2048")}
          >
            <Trophy className="h-4 w-4" />
            <span>2048</span>
          </Button>
        </div>

        {/* Área do Jogo Selecionado */}
        <div className="bg-card border rounded-2xl p-4 sm:p-8 shadow-xs flex flex-col items-center justify-center min-h-[420px]">
          {activeTab === "roleta" && <RoletaGame onCopyCoupon={copyCoupon} copiedCode={copiedCode} />}
          {activeTab === "raspadinha" && <RaspadinhaGame onCopyCoupon={copyCoupon} copiedCode={copiedCode} />}
          {activeTab === "cobrinha" && <CobrinhaGame onCopyCoupon={copyCoupon} />}
          {activeTab === "2048" && <Game2048 onCopyCoupon={copyCoupon} />}
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// 1. JOGO DA ROLETA
// ----------------------------------------------------
function RoletaGame({ onCopyCoupon, copiedCode }: { onCopyCoupon: (c: string) => void; copiedCode: string | null }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; coupon?: string } | null>(null);

  const prizes: Array<{ label: string; coupon?: string }> = [
    { label: "5% OFF", coupon: "HSDIGITAL5" },
    { label: "Tente Novamente" },
    { label: "10% OFF", coupon: "HSDIGITAL10" },
    { label: "Frete Grátis*", coupon: "FRETEHS" },
    { label: "Quase!" },
    { label: "15% OFF", coupon: "CLIENTEVIP15" },
  ];

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const selectedPrizeIndex = Math.floor(Math.random() * prizes.length);
    const degreesPerSlice = 360 / prizes.length;
    const finalAngle = rotation + extraSpins * 360 + selectedPrizeIndex * degreesPerSlice;

    setRotation(finalAngle);

    setTimeout(() => {
      setSpinning(false);
      const chosen = prizes[selectedPrizeIndex] ?? { label: "Tente Novamente" };
      setResult(chosen);
    }, 3500);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-sm w-full">
      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-red-500 font-bold text-2xl">▼</div>
        <div
          className="w-full h-full rounded-full border-4 border-primary shadow-lg overflow-hidden transition-all duration-[3500ms] ease-out flex items-center justify-center relative"
          style={{
            transform: `rotate(${rotation}deg)`,
            background:
              "conic-gradient(#f97316 0deg 60deg, #3b82f6 60deg 120deg, #10b981 120deg 180deg, #8b5cf6 180deg 240deg, #ef4444 240deg 300deg, #eab308 300deg 360deg)",
          }}
        >
          <div className="w-20 h-20 bg-background rounded-full border-4 border-primary flex items-center justify-center font-bold text-xs uppercase tracking-wider shadow-inner">
            HS Sorte
          </div>
        </div>
      </div>

      <Button size="lg" onClick={spin} disabled={spinning} className="font-bold w-full max-w-xs">
        {spinning ? "Girando a Roleta..." : "Girar Roleta Grátis"}
      </Button>

      {result && (
        <div className="bg-muted p-4 rounded-xl border w-full animate-in fade-in zoom-in duration-300">
          <p className="font-semibold text-foreground">Você tirou: {result.label}</p>
          {result.coupon ? (
            <div className="mt-3 flex items-center justify-between gap-2 bg-background p-2.5 rounded-lg border">
              <span className="font-mono font-bold text-primary tracking-wider">{result.coupon}</span>
              <Button size="sm" variant="ghost" onClick={() => onCopyCoupon(result.coupon!)}>
                {copiedCode === result.coupon ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Não desanime, gire novamente!</p>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 2. JOGO DA RASPADINHA
// ----------------------------------------------------
function RaspadinhaGame({
  onCopyCoupon,
  copiedCode,
}: {
  onCopyCoupon: (c: string) => void;
  copiedCode: string | null;
}) {
  const [scratched, setScratched] = useState(false);
  const [coupon] = useState(() => {
    const list = ["PROMO10", "DESCONTO5", "CLIENTEESPECIAL", "GANHOU7"];
    return list[Math.floor(Math.random() * list.length)];
  });

  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-sm w-full">
      <div className="space-y-1">
        <h3 className="font-bold text-lg">Raspadinha Premiada</h3>
        <p className="text-xs text-muted-foreground">Clique na área cinza para raspar e revelar seu desconto</p>
      </div>

      <div
        onClick={() => setScratched(true)}
        className="w-full h-44 rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center p-4 cursor-pointer relative overflow-hidden select-none bg-accent/20"
      >
        {!scratched ? (
          <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-700 flex flex-col items-center justify-center gap-2 text-foreground font-bold transition-opacity hover:opacity-95">
            <Gift className="h-8 w-8 text-primary animate-bounce" />
            <span>Clique aqui para raspar</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 animate-in fade-in duration-500">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Parabéns! Seu Cupom:</span>
            <span className="text-2xl font-black font-mono text-primary tracking-widest">{coupon}</span>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => onCopyCoupon(coupon)}>
              {copiedCode === coupon ? (
                <Check className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copiar Código
            </Button>
          </div>
        )}
      </div>

      {scratched && (
        <Button variant="outline" size="sm" onClick={() => setScratched(false)}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Tentar Outra Raspadinha
        </Button>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 3. JOGO DA COBRINHA (SNAKE)
// ----------------------------------------------------
function CobrinhaGame({ onCopyCoupon }: { onCopyCoupon: (c: string) => void }) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 5, y: 5 },
    { x: 4, y: 5 },
  ]);
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 10, y: 10 });
  const [dir, setDir] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const gridSize = 16;

  const resetGame = () => {
    setSnake([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    setFood({ x: 8, y: 8 });
    setDir("RIGHT");
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] };
        if (dir === "UP") head.y -= 1;
        if (dir === "DOWN") head.y += 1;
        if (dir === "LEFT") head.x -= 1;
        if (dir === "RIGHT") head.x += 1;

        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
          setGameOver(true);
          return prev;
        }

        for (const segment of prev) {
          if (segment.x === head.x && segment.y === head.y) {
            setGameOver(true);
            return prev;
          }
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => s + 10);
          setFood({
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize),
          });
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, 160);

    return () => clearInterval(interval);
  }, [dir, isPlaying, gameOver, food]);

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

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
      <div className="flex items-center justify-between w-full px-2">
        <span className="font-bold text-sm">Pontuação: {score}</span>
        {score >= 50 && (
          <span className="text-xs bg-green-500/10 text-green-600 font-bold px-2 py-0.5 rounded">
            Cupom Liberado: SNAKE50
          </span>
        )}
      </div>

      <div
        className="w-64 h-64 sm:w-72 sm:h-72 bg-zinc-900 rounded-xl relative border-2 border-primary/40 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {snake.map((seg, i) => (
          <div
            key={i}
            className={`rounded-xs ${i === 0 ? "bg-primary" : "bg-primary/70"}`}
            style={{ gridColumnStart: seg.x + 1, gridRowStart: seg.y + 1 }}
          />
        ))}
        <div
          className="bg-red-500 rounded-full animate-pulse"
          style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }}
        />

        {(!isPlaying || gameOver) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
            {gameOver ? (
              <>
                <p className="text-red-400 font-bold text-lg">Fim de Jogo!</p>
                <p className="text-white text-xs mb-3">Pontos: {score}</p>
                {score >= 50 && (
                  <Button size="sm" variant="secondary" className="mb-3" onClick={() => onCopyCoupon("SNAKE50")}>
                    Copiar Cupom 5%
                  </Button>
                )}
              </>
            ) : (
              <p className="text-white text-sm mb-3">Faça 50 pontos para liberar um cupom!</p>
            )}
            <Button size="sm" onClick={resetGame}>
              {gameOver ? "Jogar Novamente" : "Iniciar Jogo"}
            </Button>
          </div>
        )}
      </div>

      {/* Controles para Celular */}
      <div className="grid grid-cols-3 gap-1.5 w-44 sm:hidden">
        <div />
        <Button size="sm" variant="outline" onClick={() => dir !== "DOWN" && setDir("UP")}>
          ▲
        </Button>
        <div />
        <Button size="sm" variant="outline" onClick={() => dir !== "RIGHT" && setDir("LEFT")}>
          ◀
        </Button>
        <Button size="sm" variant="outline" onClick={() => dir !== "UP" && setDir("DOWN")}>
          ▼
        </Button>
        <Button size="sm" variant="outline" onClick={() => dir !== "LEFT" && setDir("RIGHT")}>
          ▶
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 4. JOGO 2048
// ----------------------------------------------------
function Game2048({ onCopyCoupon }: { onCopyCoupon: (c: string) => void }) {
  const [board, setBoard] = useState<number[][]>([
    [0, 0, 0, 0],
    [0, 2, 0, 0],
    [0, 0, 2, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);

  const initBoard = () => {
    setBoard([
      [0, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 0],
    ]);
    setScore(0);
  };

  const getTileColor = (val: number) => {
    switch (val) {
      case 2:
        return "bg-zinc-200 dark:bg-zinc-800 text-foreground";
      case 4:
        return "bg-orange-100 dark:bg-orange-950 text-orange-600";
      case 8:
        return "bg-orange-200 dark:bg-orange-900 text-orange-700";
      case 16:
        return "bg-orange-400 text-white";
      case 32:
        return "bg-orange-500 text-white";
      case 64:
        return "bg-orange-600 text-white";
      case 128:
        return "bg-amber-400 text-white";
      case 256:
        return "bg-amber-500 text-white";
      case 512:
        return "bg-primary text-white";
      case 1024:
        return "bg-primary font-bold text-white";
      case 2048:
        return "bg-emerald-500 font-black text-white";
      default:
        return "bg-muted/40 text-transparent";
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
      <div className="flex items-center justify-between w-full px-2">
        <span className="font-bold text-sm">Pontuação: {score}</span>
        <Button size="sm" variant="ghost" onClick={initBoard}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-64 h-64 sm:w-72 sm:h-72 bg-zinc-800 p-2 rounded-xl grid grid-cols-4 grid-rows-4 gap-2">
        {board.flat().map((val, idx) => (
          <div
            key={idx}
            className={`rounded-lg flex items-center justify-center font-bold text-lg select-none transition-all ${getTileColor(val)}`}
          >
            {val > 0 ? val : ""}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Combine os blocos iguais para atingir pontuações altas e desbloquear cupons secretos!
      </p>
    </div>
  );
}
