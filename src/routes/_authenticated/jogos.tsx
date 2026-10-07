import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, RotateCw, Sparkles, TicketPercent } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
        content: "Roleta, raspadinha e arcade com prêmios na HS Digital.",
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
  none: "Não foi dessa vez. Tente novamente amanhã!",
};

const wheelPosition: Record<Outcome, number> = {
  shipping_5: 90,
  shipping_10: 180,
  free_shipping: 270,
  none: 0,
};

function GamesPage() {
  const statusFn = useServerFn(getGameStatus);
  const [status, setStatus] = useState<{
    wheel: string | null;
    scratch: string | null;
    coins: number;
  }>({ wheel: null, scratch: null, coins: 0 });

  useEffect(() => {
    statusFn()
      .then(setStatus)
      .catch(() => undefined);
  }, [statusFn]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-amber-500">
              <Sparkles className="h-4 w-4" /> Prêmios Diários Oficiais
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Jogos & Prêmios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gire a roleta e raspe a cartela diariamente para ganhar cupons de desconto no frete.
            </p>
          </div>
          <Button asChild variant="outline" className="font-bold">
            <Link to="/cupons">
              <TicketPercent className="h-4 w-4 text-primary" /> Meus Cupons
            </Link>
          </Button>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <WheelGame
            played={Boolean(status.wheel)}
            onPlayed={(outcome) => setStatus((s) => ({ ...s, wheel: outcome }))}
          />
          <ScratchGame
            played={Boolean(status.scratch)}
            onPlayed={(outcome) => setStatus((s) => ({ ...s, scratch: outcome }))}
          />
        </div>

        <ArcadeHall initialCoins={status.coins} onCoins={(coins) => setStatus((current) => ({ ...current, coins }))} />
      </main>
      <SiteFooter />
    </div>
  );
}

function WheelGame({ played, onPlayed }: { played: boolean; onPlayed: (outcome: Outcome) => void }) {
  const play = useServerFn(playDailyGame);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);

  const spin = async () => {
    if (played || spinning) return;
    setSpinning(true);
    setResult(null);

    try {
      const reward = await play({ data: { gameType: "wheel" } });
      const outcome = reward.outcome as Outcome;
      const outcomeAngle = wheelPosition[outcome];
      setRotation((current) => current + 1440 + (360 - outcomeAngle));

      setTimeout(() => {
        setResult(outcome);
        onPlayed(outcome);
        setSpinning(false);
        if (outcome !== "none") {
          toast.success("Parabéns! Você ganhou um cupom de frete!");
        } else {
          toast.info("Não foi dessa vez. Volte amanhã para tentar novamente!");
        }
      }, 3500);
    } catch (err) {
      setSpinning(false);
      toast.error(err instanceof Error ? err.message : "Erro ao girar a roleta.");
    }
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">
            <RotateCw className="h-3.5 w-3.5" /> Roleta
          </span>
          <span className="text-xs font-semibold text-muted-foreground">1x por dia</span>
        </div>
        <h3 className="mt-3 text-xl font-black text-foreground">Roleta da Sorte</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Gire para tentar a sorte e ganhar até frete grátis para suas compras.
        </p>

        <div className="relative mt-6 flex items-center justify-center py-4">
          <div className="absolute top-2 z-10 -translate-x-1/2 text-2xl font-black text-amber-500 drop-shadow">▼</div>
          <div
            className="flex h-44 w-44 items-center justify-center rounded-full border-4 border-primary/50 shadow-xl transition-transform duration-[3500ms] ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              background:
                "conic-gradient(#f59e0b 0deg 90deg, #3b82f6 90deg 180deg, #10b981 180deg 270deg, #64748b 270deg 360deg)",
            }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-inner">
              <Gift className="h-6 w-6 text-foreground" />
            </div>
          </div>
        </div>

        {result && (
          <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-primary">Resultado:</p>
            <p className="mt-0.5 text-sm font-bold">{rewardText[result]}</p>
          </div>
        )}
      </div>

      <Button onClick={spin} disabled={played || spinning} className="mt-6 w-full font-black text-sm h-11">
        {spinning ? (
          <span className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 animate-spin" /> Girando a roleta...
          </span>
        ) : played ? (
          "Rodada de hoje já utilizada"
        ) : (
          "Girar Roleta Grátis"
        )}
      </Button>
    </div>
  );
}

function ScratchGame({ played, onPlayed }: { played: boolean; onPlayed: (outcome: Outcome) => void }) {
  const play = useServerFn(playDailyGame);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scratched, setScratched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PASSE O DEDO PARA RASPAR", canvas.width / 2, canvas.height / 2 + 5);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const scratchAt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (played || scratched || loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    if (!result) {
      setLoading(true);
      play({ data: { gameType: "scratch" } })
        .then((reward) => {
          const outcome = reward.outcome as Outcome;
          setResult(outcome);
          setScratched(true);
          onPlayed(outcome);
          setLoading(false);
          if (outcome !== "none") {
            toast.success("Raspadinha premiada! Cupom salvo na sua conta.");
          } else {
            toast.info("Não foi dessa vez. Volte amanhã para tentar novamente!");
          }
        })
        .catch((err) => {
          setLoading(false);
          toast.error(err instanceof Error ? err.message : "Erro ao raspar.");
        });
    }
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase text-emerald-500">
            <TicketPercent className="h-3.5 w-3.5" /> Raspadinha
          </span>
          <span className="text-xs font-semibold text-muted-foreground">1x por dia</span>
        </div>
        <h3 className="mt-3 text-xl font-black text-foreground">Raspadinha da Sorte</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Raspe o cartão com o dedo para revelar o seu prêmio do dia.
        </p>

        <div className="relative mt-6 flex items-center justify-center py-4">
          <div className="relative flex h-32 w-64 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <p className="text-sm font-black text-foreground">{result ? rewardText[result] : "Raspando..."}</p>
            {!played && (
              <canvas
                ref={canvasRef}
                width={256}
                height={128}
                onPointerMove={scratchAt}
                className="absolute inset-0 h-full w-full cursor-pointer rounded-xl touch-none"
              />
            )}
          </div>
        </div>

        {result && (
          <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-500">Resultado:</p>
            <p className="mt-0.5 text-sm font-bold">{rewardText[result]}</p>
          </div>
        )}
      </div>

      <Button
        disabled={played || scratched || loading}
        variant="secondary"
        className="mt-6 w-full font-black text-sm h-11"
      >
        {played || scratched ? "Raspadinha de hoje já utilizada" : "Raspe a cartela acima"}
      </Button>
    </div>
  );
}
