import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  Gift,
  RotateCw,
  Sparkles,
  TicketPercent,
  Trophy,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getGameStatus, playDailyGame } from "@/lib/games.functions";
import { ArcadeHall } from "@/components/games/arcade-hall";

export const Route = createFileRoute("/_authenticated/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos & Prêmios · HS Digital" },
      { name: "description", content: "Jogue diariamente e ganhe cupons de frete na HS Digital." },
      { property: "og:title", content: "Jogos & Prêmios · HS Digital" },
      {
        property: "og:description",
        content: "Roleta, raspadinha e cobrinha com prêmios na HS Digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamesPage,
});

type Outcome = "shipping_5" | "shipping_10" | "free_shipping" | "none";

const rewardText: Record<Outcome, string> = {
  shipping_5: "5% de desconto no frete",
  shipping_10: "10% de desconto no frete",
  free_shipping: "Frete grátis até R$ 30",
  none: "Não foi dessa vez",
};

const wheelPosition: Record<Outcome, number> = {
  shipping_5: 90,
  shipping_10: 180,
  free_shipping: 270,
  none: 0,
};

function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number; isMidnight: boolean } {
  const now = new Date();
  const spString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const spDate = new Date(spString);
  const midnight = new Date(spDate);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = midnight.getTime() - spDate.getTime();
  if (diffMs <= 1000) {
    return { hours: 0, minutes: 0, seconds: 0, isMidnight: true };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, isMidnight: false };
}

function GamesPage() {
  const statusFn = useServerFn(getGameStatus);
  const [status, setStatus] = useState<{
    wheel: string | null;
    scratch: string | null;
    coins: number;
  }>({ wheel: null, scratch: null, coins: 0 });

  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());

  const refreshStatus = useCallback(() => {
    statusFn()
      .then(setStatus)
      .catch(() => undefined);
  }, [statusFn]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeUntilMidnight();
      setTimeLeft(remaining);
      if (remaining.isMidnight) {
        refreshStatus();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  const countdownText = `${timeLeft.hours}h ${timeLeft.minutes.toString().padStart(2, "0")}m`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sparkles className="h-4 w-4" /> Prêmios todos os dias · Renova à meia-noite (00:00)
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Jogos & Prêmios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ganhe descontos para usar no frete. 1 giro e 1 raspadinha por dia. Cada prêmio vale por 24 horas.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/cupons">
              <TicketPercent className="h-4 w-4" /> Meus cupons
            </Link>
          </Button>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <WheelGame
            played={Boolean(status.wheel)}
            countdownText={countdownText}
            onPlayed={(outcome) => setStatus((s) => ({ ...s, wheel: outcome }))}
          />
          <ScratchGame
            played={Boolean(status.scratch)}
            countdownText={countdownText}
            onPlayed={(outcome) => setStatus((s) => ({ ...s, scratch: outcome }))}
          />
        </div>
        <ArcadeHall
          initialCoins={status.coins}
          onCoins={(coins) => setStatus((current) => ({ ...current, coins }))}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function WheelGame({
  played,
  countdownText,
  onPlayed,
}: {
  played: boolean;
  countdownText: string;
  onPlayed: (outcome: Outcome) => void;
}) {
  const play = useServerFn(playDailyGame);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);

  const spin = async () => {
    setSpinning(true);
    try {
      const reward = await play({ data: { gameType: "wheel" } });
      const outcome = reward.outcome as Outcome;
      const outcomeAngle = wheelPosition[outcome];
      setRotation((current) => current + 1440 + (360 - outcomeAngle));
      window.setTimeout(() => {
        setResult(outcome);
        setSpinning(false);
        onPlayed(outcome);
      }, 3600);
    } catch (error) {
      setSpinning(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível girar.");
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">1 giro por dia</p>
            <h2 className="mt-1 text-xl font-bold">Roleta premiada</h2>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <RotateCw className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-7">
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-x-[17px] border-t-[34px] border-x-transparent border-t-foreground drop-shadow-md" />
          <div className="h-full w-full rounded-full border-[9px] border-foreground bg-card p-2 shadow-xl">
            <div
              className="relative h-full w-full overflow-hidden rounded-full transition-transform duration-[3500ms] ease-[cubic-bezier(.12,.75,.18,1)] motion-reduce:duration-0"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute inset-0 game-wheel-bg" />
              <span className="absolute left-1/2 top-[17%] w-[42%] -translate-x-1/2 text-center text-sm font-black leading-tight text-primary-foreground drop-shadow-md sm:text-xl">
                Não foi dessa vez
              </span>
              <span className="absolute right-[4%] top-1/2 w-[34%] -translate-y-1/2 text-center text-sm font-black leading-tight text-foreground sm:text-xl">
                5% no frete
              </span>
              <span className="absolute bottom-[16%] left-1/2 w-[42%] -translate-x-1/2 text-center text-sm font-black leading-tight text-primary-foreground drop-shadow-md sm:text-xl">
                10% no frete
              </span>
              <span className="absolute left-[4%] top-1/2 w-[34%] -translate-y-1/2 text-center text-sm font-black leading-tight text-foreground sm:text-xl">
                Frete grátis
              </span>
              <div className="absolute left-1/2 top-1/2 grid h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-card bg-foreground text-wheel-gift shadow-lg">
                <Gift className="h-1/2 w-1/2" />
              </div>
            </div>
          </div>
        </div>
        {result ? (
          <Result outcome={result} />
        ) : (
          <div className="mt-6 space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={() => void spin()}
              disabled={played || spinning}
            >
              {spinning ? "Girando…" : played ? "Giro diário já realizado" : "Girar agora"}
            </Button>
            {played && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium text-center">
                <Clock className="h-3.5 w-3.5" /> Próximo giro libera à meia-noite (em {countdownText})
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Result({ outcome }: { outcome: Outcome }) {
  return (
    <div
      className={`mt-5 rounded-lg border p-4 text-center animate-scale-in ${outcome === "none" ? "border-border bg-muted" : "border-primary/30 bg-primary/5"}`}
    >
      <Trophy
        className={`mx-auto h-6 w-6 ${outcome === "none" ? "text-muted-foreground" : "text-primary"}`}
      />
      <p className="mt-2 font-bold">{rewardText[outcome]}</p>
      {outcome !== "none" && (
        <p className="mt-1 text-xs text-muted-foreground">Seu cupom já está em Meus cupons.</p>
      )}
    </div>
  );
}

function ScratchGame({
  played,
  countdownText,
  onPlayed,
}: {
  played: boolean;
  countdownText: string;
  onPlayed: (outcome: Outcome) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const revealed = useRef(false);
  const scratchMoves = useRef(0);
  const play = useServerFn(playDailyGame);
  const [result, setResult] = useState<Outcome | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    // Fundo cinza prateado de raspadinha
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, "#94a3b8");
    grad.addColorStop(0.5, "#cbd5e1");
    grad.addColorStop(1, "#64748b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Texto de instrução
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ Raspe aqui com o dedo ✨", rect.width / 2, rect.height / 2);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const requestPrizeIfNeeded = useCallback(() => {
    if (!result && !played) {
      play({ data: { gameType: "scratch" } })
        .then((reward) => {
          const outcome = reward.outcome as Outcome;
          setResult(outcome);
          onPlayed(outcome);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Não foi possível validar a raspadinha.");
        });
    }
  }, [play, result, played, onPlayed]);

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 44;

    ctx.beginPath();
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPos.current = { x, y };

    scratchMoves.current += 1;
    if (scratchMoves.current % 10 === 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let cleared = 0;
      for (let i = 3; i < data.length; i += 8) {
        if (data[i] === 0) cleared++;
      }
      const totalSampled = data.length / 8;
      if (cleared / totalSampled > 0.35 && !revealed.current) {
        revealed.current = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">1 raspadinha por dia</p>
            <h2 className="mt-1 text-xl font-bold">Raspadinha da sorte</h2>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Gift className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-7">
        <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted select-none">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {result ? (
              <>
                <Trophy
                  className={`h-8 w-8 ${result === "none" ? "text-muted-foreground" : "text-primary"}`}
                />
                <p className="mt-2 text-lg font-bold">{rewardText[result]}</p>
                {result !== "none" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cupom gerado e salvo em Meus cupons.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">
                {played ? "Você já raspou hoje!" : "Raspe a área prateada para ver seu prêmio"}
              </p>
            )}
          </div>

          {!played && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-pointer touch-none"
              // Suporte a mouse
              onMouseDown={(e) => {
                isScratching.current = true;
                requestPrizeIfNeeded();
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                lastPos.current = { x, y };
                scratchAt(x, y);
              }}
              onMouseMove={(e) => {
                if (!isScratching.current) return;
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                scratchAt(x, y);
              }}
              onMouseUp={() => {
                isScratching.current = false;
                lastPos.current = null;
              }}
              onMouseLeave={() => {
                isScratching.current = false;
                lastPos.current = null;
              }}
              // Suporte nativo ao dedo / toque no celular sem travar a tela
              onTouchStart={(e) => {
                isScratching.current = true;
                requestPrizeIfNeeded();
                const touch = e.touches[0];
                if (touch) {
                  const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
                  lastPos.current = { x, y };
                  scratchAt(x, y);
                }
              }}
              onTouchMove={(e) => {
                if (!isScratching.current) return;
                const touch = e.touches[0];
                if (touch) {
                  const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
                  scratchAt(x, y);
                }
              }}
              onTouchEnd={() => {
                isScratching.current = false;
                lastPos.current = null;
              }}
            />
          )}
        </div>
        {played && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium text-center">
            <Clock className="h-3.5 w-3.5" /> Próxima raspadinha libera à meia-noite (em {countdownText})
          </p>
        )}
      </div>
    </section>
  );
}
