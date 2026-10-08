import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Gift,
  RotateCw,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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

  const handleCoinsUpdate = useCallback((coins: number) => {
    setStatus((current) => ({ ...current, coins }));
  }, []);

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
          onCoins={handleCoinsUpdate}
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
  const [, setResult] = useState<Outcome | null>(null);

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
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center">
          {played ? (
            <p className="text-sm font-medium text-muted-foreground">Volta em {countdownText}</p>
          ) : (
            <Button size="lg" disabled={spinning} onClick={() => void spin()} className="min-w-44 font-black">
              {spinning ? "Girando…" : "Girar roleta"}
            </Button>
          )}
        </div>
      </div>
    </section>
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
  const play = useServerFn(playDailyGame);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const initScratch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Raspe aqui para revelar!", canvas.width / 2, canvas.height / 2);
  }, []);

  useEffect(() => {
    if (!played && !revealed) {
      initScratch();
    }
  }, [played, revealed, initScratch]);

  const scratch = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isScratching.current || revealed || played) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    if (!outcome && !loading) {
      setLoading(true);
      play({ data: { gameType: "scratch" } })
        .then((reward) => {
          const out = reward.outcome as Outcome;
          setOutcome(out);
          onPlayed(out);
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao raspar.");
        })
        .finally(() => setLoading(false));
    }
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
        <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border bg-muted">
          <div className="text-center p-6">
            <h3 className="text-2xl font-black text-primary">
              {outcome === "free_shipping" && "Frete Grátis até R$ 30!"}
              {outcome === "shipping_10" && "10% de desconto no frete!"}
              {outcome === "shipping_5" && "5% de desconto no frete!"}
              {outcome === "none" && "Tente novamente amanhã!"}
              {!outcome && (played ? "Já jogou hoje!" : "Raspe a camada acima")}
            </h3>
          </div>
          {!played && (
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              onPointerDown={() => (isScratching.current = true)}
              onPointerUp={() => (isScratching.current = false)}
              onPointerLeave={() => (isScratching.current = false)}
              onPointerMove={scratch}
              className="absolute inset-0 h-full w-full cursor-pointer touch-none"
            />
          )}
        </div>
        <div className="mt-6 text-center">
          {played && <p className="text-sm font-medium text-muted-foreground">Volta em {countdownText}</p>}
        </div>
      </div>
    </section>
  );
}
