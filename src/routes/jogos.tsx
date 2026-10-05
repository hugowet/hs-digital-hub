import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getGameStatus, playDailyGame } from "@/lib/games.functions";
import { ArcadeHall } from "@/components/games/arcade-hall";

export const Route = createFileRoute("/jogos")({
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
type Direction = "up" | "down" | "left" | "right";

const rewardText: Record<Outcome, string> = {
  shipping_5: "5% de desconto no frete",
  shipping_10: "10% de desconto no frete",
  free_shipping: "Frete grátis até R$ 30",
  none: "Não foi dessa vez",
};
const wheelLabels = ["5% no frete", "10% no frete", "Frete grátis", "Não foi dessa vez"];
const outcomeIndex: Record<Outcome, number> = {
  shipping_5: 0,
  shipping_10: 1,
  free_shipping: 2,
  none: 3,
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
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sparkles className="h-4 w-4" /> Prêmios todos os dias
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Jogos & Prêmios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ganhe descontos para usar no frete. Cada prêmio vale por 24 horas e tem limite de R$
              30.
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
            onPlayed={(outcome) => setStatus((s) => ({ ...s, wheel: outcome }))}
          />
          <ScratchGame
            played={Boolean(status.scratch)}
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
  onPlayed,
}: {
  played: boolean;
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
      const index = outcomeIndex[outcome];
      setRotation((current) => current + 1440 + (360 - index * 90 - 45));
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
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[28px] border-x-transparent border-t-foreground" />
          <div className="h-full w-full rounded-full border-8 border-foreground bg-muted p-2 shadow-xl">
            <div
              className="relative h-full w-full overflow-hidden rounded-full transition-transform duration-[3500ms] ease-[cubic-bezier(.12,.75,.18,1)] motion-reduce:duration-0"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute inset-0 game-wheel-bg" />
              {wheelLabels.map((label, index) => {
                const angle = index * 90 + 45;
                return (
                  <span
                    key={label}
                    className="absolute left-1/2 top-1/2 h-1/2 w-28 -translate-x-1/2 origin-top pt-7 text-center text-[11px] font-black leading-tight text-white drop-shadow-md sm:text-sm"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span className="inline-block" style={{ transform: `rotate(${-angle}deg)` }}>
                      {label}
                    </span>
                  </span>
                );
              })}
              <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-card bg-foreground text-primary-foreground shadow-lg">
                <Gift className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
        {result ? (
          <Result outcome={result} />
        ) : (
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => void spin()}
            disabled={played || spinning}
          >
            {spinning ? "Girando…" : played ? "Giro diário já realizado" : "Girar agora"}
          </Button>
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
  onPlayed,
}: {
  played: boolean;
  onPlayed: (outcome: Outcome) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratching = useRef(false);
  const revealed = useRef(false);
  const scratchMoves = useRef(0);
  const play = useServerFn(playDailyGame);
  const [result, setResult] = useState<Outcome | null>(null);
  const [progress, setProgress] = useState(0);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * window.devicePixelRatio);
    canvas.height = Math.round(rect.height * window.devicePixelRatio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    const styles = getComputedStyle(document.documentElement);
    context.fillStyle = styles.getPropertyValue("--primary");
    context.fillRect(0, 0, rect.width, rect.height);
    context.fillStyle = styles.getPropertyValue("--primary-foreground");
    context.font = "700 15px Manrope";
    context.textAlign = "center";
    context.fillText("RASPE AQUI", rect.width / 2, rect.height / 2 + 5);
  }, []);
  useEffect(() => {
    resetCanvas();
    window.addEventListener("resize", resetCanvas);
    return () => window.removeEventListener("resize", resetCanvas);
  }, [resetCanvas]);

  const scratch = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!scratching.current || played || revealed.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(event.clientX - rect.left, event.clientY - rect.top, 22, 0, Math.PI * 2);
    context.fill();
    context.restore();
    scratchMoves.current += 1;
    if (scratchMoves.current % 4 !== 0) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let index = 3; index < pixels.length; index += 4)
      if (pixels[index] === 0) transparent += 1;
    const next = Math.round((transparent / (pixels.length / 4)) * 100);
    setProgress(next);
    if (next >= 55) {
      revealed.current = true;
      play({ data: { gameType: "scratch" } })
        .then((reward) => {
          const outcome = reward.outcome as Outcome;
          setResult(outcome);
          onPlayed(outcome);
          context.clearRect(0, 0, canvas.width, canvas.height);
        })
        .catch((error) => {
          revealed.current = false;
          toast.error(error instanceof Error ? error.message : "Não foi possível revelar.");
        });
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">1 raspadinha por dia</p>
            <h2 className="mt-1 text-xl font-bold">Raspadinha surpresa</h2>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-7">
        <div className="relative mx-auto aspect-[1.7] w-full max-w-md overflow-hidden rounded-lg border-2 border-dashed border-primary/40 bg-muted">
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <Gift className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-3 text-xl font-black">
                {result ? rewardText[result] : "Seu prêmio está aqui"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Válido por 24 horas</p>
            </div>
          </div>
          {!result && (
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 h-full w-full touch-none ${played ? "pointer-events-none opacity-50" : "cursor-crosshair"}`}
              onPointerDown={(event) => {
                scratching.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                scratch(event);
              }}
              onPointerMove={scratch}
              onPointerUp={() => {
                scratching.current = false;
              }}
              onPointerCancel={() => {
                scratching.current = false;
              }}
              aria-label="Raspe movendo o dedo ou mouse"
            />
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {played && !result
              ? "Raspadinha diária já utilizada"
              : result
                ? "Prêmio revelado"
                : "Passe o dedo ou mouse para raspar"}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        {result && <Result outcome={result} />}
      </div>
    </section>
  );
}

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef<Direction>("right");
  const nextDirection = useRef<Direction>("right");
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [level, setLevel] = useState(1);
  const setDirection = (direction: Direction) => {
    const opposite = { up: "down", down: "up", left: "right", right: "left" } as const;
    if (direction !== opposite[directionRef.current]) nextDirection.current = direction;
  };
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const cells = 22;
    const size = canvas.width / cells;
    let snake = [
      { x: 7, y: 11 },
      { x: 6, y: 11 },
      { x: 5, y: 11 },
    ];
    let food = { x: 16, y: 11 };
    let points = 0;
    let frame = 0;
    let last = 0;
    let animation = 0;
    const placeFood = () => {
      do {
        food = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
      } while (snake.some((part) => part.x === food.x && part.y === food.y));
    };
    const draw = (time: number) => {
      const speed = Math.max(70, 150 - Math.floor(points / 3) * 9);
      if (time - last >= speed) {
        last = time;
        frame += 1;
        directionRef.current = nextDirection.current;
        const velocity: Record<Direction, readonly [number, number]> = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        };
        const [dx, dy] = velocity[directionRef.current];
        const currentHead = snake[0]!;
        const head = {
          x: (currentHead.x + dx + cells) % cells,
          y: (currentHead.y + dy + cells) % cells,
        };
        if (snake.some((part) => part.x === head.x && part.y === head.y)) {
          setRunning(false);
          setBest((current) => Math.max(current, points));
          return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          points += 1;
          setScore(points);
          setLevel(1 + Math.floor(points / 3));
          placeFood();
        } else snake.pop();
      }
      const styles = getComputedStyle(document.documentElement);
      context.fillStyle = styles.getPropertyValue("--ink");
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = styles.getPropertyValue("--border");
      context.globalAlpha = 0.16;
      for (let i = 1; i < cells; i += 1) {
        context.beginPath();
        context.moveTo(i * size, 0);
        context.lineTo(i * size, canvas.height);
        context.stroke();
        context.beginPath();
        context.moveTo(0, i * size);
        context.lineTo(canvas.width, i * size);
        context.stroke();
      }
      context.globalAlpha = 1;
      snake.forEach((part, index) => {
        context.fillStyle =
          index === 0
            ? styles.getPropertyValue("--primary-glow")
            : styles.getPropertyValue("--primary");
        const inset = index === 0 ? 1 : 2;
        context.fillRect(
          part.x * size + inset,
          part.y * size + inset,
          size - inset * 2,
          size - inset * 2,
        );
      });
      context.fillStyle = styles.getPropertyValue("--success");
      context.beginPath();
      context.arc(
        food.x * size + size / 2,
        food.y * size + size / 2,
        size * (0.27 + Math.sin(frame * 0.7) * 0.04),
        0,
        Math.PI * 2,
      );
      context.fill();
      animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation);
  }, [running]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const keys: Record<string, Direction> = {
        ArrowUp: "up",
        w: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      };
      const direction = keys[event.key];
      if (direction) {
        event.preventDefault();
        setDirection(direction);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const start = () => {
    directionRef.current = "right";
    nextDirection.current = "right";
    setScore(0);
    setLevel(1);
    setRunning(true);
  };
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card lg:grid lg:grid-cols-[340px_1fr]">
      <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
        <p className="text-xs font-bold uppercase text-primary">Desafio livre</p>
        <h2 className="mt-1 text-2xl font-bold">Cobrinha Turbo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A velocidade aumenta a cada três frutas. Atravesse as bordas e tente superar seu recorde.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-3">
            <strong className="block text-xl text-primary">{score}</strong>
            <span className="text-[11px] text-muted-foreground">Pontos</span>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <strong className="block text-xl text-primary">{level}</strong>
            <span className="text-[11px] text-muted-foreground">Nível</span>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <strong className="block text-xl text-primary">{best}</strong>
            <span className="text-[11px] text-muted-foreground">Recorde</span>
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={start}>
          {running ? "Reiniciar partida" : score > 0 ? "Jogar novamente" : "Começar"}
        </Button>
      </div>
      <div className="grid place-items-center bg-foreground p-4 sm:p-6">
        <div className="w-full max-w-md">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            className="aspect-square w-full rounded-lg border border-primary/30"
            aria-label="Jogo da cobrinha"
          />
          <div className="mx-auto mt-3 grid w-36 grid-cols-3 gap-1">
            <span />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setDirection("up")}
              aria-label="Cima"
            >
              <ArrowUp />
            </Button>
            <span />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setDirection("left")}
              aria-label="Esquerda"
            >
              <ArrowLeft />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setDirection("down")}
              aria-label="Baixo"
            >
              <ArrowDown />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setDirection("right")}
              aria-label="Direita"
            >
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
