import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bird,
  Car,
  CircleDot,
  Gamepad2,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { finishArcadeGame, startArcadeGame } from "@/lib/games.functions";

type Game = "snake" | "pacman" | "flappy" | "highway";
type Point = { x: number; y: number };
const games: Array<{ id: Game; title: string; Icon: LucideIcon; help: string }> = [
  {
    id: "snake",
    title: "Cobrinha Turbo",
    Icon: Gamepad2,
    help: "Colete moedas, atravesse as bordas e não encoste no próprio corpo.",
  },
  {
    id: "pacman",
    title: "Come-Come",
    Icon: CircleDot,
    help: "Coma as pastilhas e moedas do labirinto enquanto foge dos fantasmas.",
  },
  {
    id: "flappy",
    title: "Pássaro Voador",
    Icon: Bird,
    help: "Toque na tela ou aperte espaço para passar entre os canos.",
  },
  {
    id: "highway",
    title: "Desvia e Coleta",
    Icon: Car,
    help: "Troque de faixa, desvie dos carros e passe por cima das moedas.",
  },
];

export function ArcadeHall({
  initialCoins,
  onCoins,
}: {
  initialCoins: number;
  onCoins: (coins: number) => void;
}) {
  const [selected, setSelected] = useState<(typeof games)[number] | null>(null);
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-primary">Arcade HS</p>
          <h2 className="mt-1 text-2xl font-black">Quatro jogos, uma carteira de moedas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A cada 1.000 moedas, você recebe um cupom de 10% no frete por 24 horas.
          </p>
        </div>
        <div className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
          🪙 {initialCoins.toLocaleString("pt-BR")} moedas
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelected(game)}
            className="group overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-xl"
          >
            <div className="grid h-36 place-items-center bg-gradient-to-br from-[#140825] via-[#3b0a69] to-[#7c24d4] transition group-hover:scale-105">
              <game.Icon className="h-14 w-14 text-primary-foreground" strokeWidth={1.6} />
            </div>
            <div className="p-4">
              <h3 className="font-black">{game.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{game.help}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                <Play className="h-3 w-3" /> Jogar em tela cheia
              </span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <ArcadeScreen
          game={selected}
          hardMode={initialCoins >= 500}
          onClose={() => setSelected(null)}
          onCoins={onCoins}
        />
      )}
    </section>
  );
}

function ArcadeScreen({
  game,
  hardMode,
  onClose,
  onCoins,
}: {
  game: (typeof games)[number];
  hardMode: boolean;
  onClose: () => void;
  onCoins: (coins: number) => void;
}) {
  const startServer = useServerFn(startArcadeGame);
  const finishServer = useServerFn(finishArcadeGame);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"intro" | "playing" | "over">("intro");
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef({ x: 1, y: 0, flap: false, lane: 1 });

  const finish = useCallback(
    async (earned: number) => {
      if (!sessionRef.current) return;
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      setPhase("over");
      try {
        const result = await finishServer({ data: { sessionId, coins: earned } });
        if (result) {
          onCoins(result.total_coins);
          setCoins(result.accepted_coins);
          if (result.coupon_code)
            toast.success("Você alcançou 1.000 moedas e ganhou 10% no frete!");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar as moedas.");
      }
    },
    [finishServer, onCoins],
  );

  const start = async () => {
    setBusy(true);
    try {
      const result = await startServer({ data: { gameType: game.id } });
      if (!result) throw new Error();
      sessionRef.current = result.session_id;
      setCoins(0);
      setPhase("playing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = canvas.width,
      h = canvas.height;
    let raf = 0,
      last = 0,
      earned = 0,
      alive = true;
    const end = () => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      void finish(earned);
    };
    if (game.id === "snake") {
      let snake: Point[] = [
          { x: 7, y: 10 },
          { x: 6, y: 10 },
          { x: 5, y: 10 },
        ],
        food = { x: 15, y: 10 },
        dir = { x: 1, y: 0 };
      const tick = (t: number) => {
        if (!alive) return;
        if (t - last > (hardMode ? 82 : 125)) {
          last = t;
          const next = input.current;
          if (!(next.x === -dir.x && next.y === -dir.y)) dir = { x: next.x, y: next.y };
          const head = { x: (snake[0]!.x + dir.x + 22) % 22, y: (snake[0]!.y + dir.y + 22) % 22 };
          if (snake.some((p) => p.x === head.x && p.y === head.y)) return end();
          snake.unshift(head);
          if (head.x === food.x && head.y === food.y) {
            earned += 10;
            setCoins(earned);
            do {
              food = { x: Math.floor(Math.random() * 22), y: Math.floor(Math.random() * 22) };
            } while (snake.some((p) => p.x === food.x && p.y === food.y));
          } else snake.pop();
        }
        ctx.fillStyle = "#090313";
        ctx.fillRect(0, 0, w, h);
        const s = w / 22;
        snake.forEach((p, i) => {
          ctx.fillStyle = i ? "#8b2be2" : "#d7a8ff";
          ctx.fillRect(p.x * s + 2, p.y * s + 2, s - 4, s - 4);
        });
        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.arc((food.x + 0.5) * s, (food.y + 0.5) * s, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (game.id === "flappy") {
      let y = h / 2,
        velocity = 0,
        x = 100,
        pipes = [{ x: w, gap: h / 2 }],
        passed = new Set<number>();
      const tick = (t: number) => {
        if (!alive) return;
        const dt = Math.min(32, t - last || 16);
        last = t;
        if (input.current.flap) {
          velocity = -7;
          input.current.flap = false;
        }
        velocity += 0.38 * (dt / 16);
        y += velocity * (dt / 16);
        pipes.forEach((p, i) => {
          p.x -= (hardMode ? 4.4 : 3.2) * (dt / 16);
          if (!passed.has(i) && p.x < x) {
            passed.add(i);
            earned += 10;
            setCoins(earned);
          }
          if (x + 13 > p.x && x - 13 < p.x + 58 && (y - 13 < p.gap - 72 || y + 13 > p.gap + 72))
            end();
        });
        if (pipes[0]!.x < -70) {
          pipes = [{ x: w, gap: 100 + Math.random() * (h - 200) }];
          passed = new Set();
        }
        if (y < 0 || y > h) end();
        ctx.fillStyle = "#170629";
        ctx.fillRect(0, 0, w, h);
        pipes.forEach((p) => {
          ctx.fillStyle = "#21c46b";
          ctx.fillRect(p.x, 0, 58, p.gap - 72);
          ctx.fillRect(p.x, p.gap + 72, 58, h);
        });
        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (game.id === "highway") {
      let objects = Array.from({ length: 6 }, (_, i) => ({
        lane: i % 3,
        y: -i * 130,
        coin: i % 2 === 0,
      }));
      const tick = (t: number) => {
        if (!alive) return;
        const dt = Math.min(32, t - last || 16);
        last = t;
        const carY = h - 90;
        objects.forEach((o) => {
          o.y += (hardMode ? 7 : 5) * (dt / 16);
          if (o.y > h) {
            o.y = -100 - Math.random() * 300;
            o.lane = Math.floor(Math.random() * 3);
            o.coin = Math.random() > 0.45;
          }
          const ox = w * 0.2 + o.lane * w * 0.3;
          if (Math.abs(o.y - carY) < 42 && o.lane === input.current.lane) {
            if (o.coin) {
              earned += 10;
              setCoins(earned);
              o.y = -150;
            } else end();
          }
        });
        ctx.fillStyle = "#191919";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#fff8";
        ctx.setLineDash([30, 25]);
        [0.35, 0.65].forEach((n) => {
          ctx.beginPath();
          ctx.moveTo(w * n, 0);
          ctx.lineTo(w * n, h);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        objects.forEach((o) => {
          const ox = w * 0.2 + o.lane * w * 0.3;
          ctx.fillStyle = o.coin ? "#ffd43b" : "#ef4444";
          o.coin
            ? (ctx.beginPath(), ctx.arc(ox, o.y, 13, 0, Math.PI * 2), ctx.fill())
            : ctx.fillRect(ox - 18, o.y - 30, 36, 60);
        });
        const cx = w * 0.2 + input.current.lane * w * 0.3;
        ctx.fillStyle = "#8b2be2";
        ctx.fillRect(cx - 20, carY - 32, 40, 64);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      const size = 28,
        cols = Math.floor(w / size),
        rows = Math.floor(h / size);
      let hero = { x: 1, y: 1 },
        ghost = { x: cols - 2, y: rows - 2 },
        dots = new Set<string>();
      for (let y = 1; y < rows - 1; y += 2)
        for (let x = 1; x < cols - 1; x += 2) dots.add(`${x},${y}`);
      const tick = (t: number) => {
        if (!alive) return;
        if (t - last > (hardMode ? 105 : 155)) {
          last = t;
          hero = {
            x: Math.max(0, Math.min(cols - 1, hero.x + input.current.x)),
            y: Math.max(0, Math.min(rows - 1, hero.y + input.current.y)),
          };
          const key = `${hero.x},${hero.y}`;
          if (dots.delete(key)) {
            earned += 10;
            setCoins(earned);
          }
          ghost = {
            x: ghost.x + Math.sign(hero.x - ghost.x) * (Math.random() > 0.35 ? 1 : 0),
            y: ghost.y + Math.sign(hero.y - ghost.y) * (Math.random() > 0.35 ? 1 : 0),
          };
        }
        if (hero.x === ghost.x && hero.y === ghost.y) return end();
        ctx.fillStyle = "#08031b";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#7050a0";
        for (let x = 0; x < w; x += size * 4) ctx.fillRect(x, 0, 5, h);
        ctx.fillStyle = "#f5d90a";
        dots.forEach((k) => {
          const [x, y] = k.split(",").map(Number);
          ctx.beginPath();
          ctx.arc((x! + 0.5) * size, (y! + 0.5) * size, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc((hero.x + 0.5) * size, (hero.y + 0.5) * size, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4d8d";
        ctx.fillRect(ghost.x * size + 5, ghost.y * size + 5, 20, 20);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [phase, game.id, hardMode, finish]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        input.current.flap = true;
        input.current.y = -1;
        input.current.x = 0;
      }
      if (e.key === "ArrowDown") {
        input.current.y = 1;
        input.current.x = 0;
      }
      if (e.key === "ArrowLeft") {
        input.current.x = -1;
        input.current.y = 0;
        input.current.lane = Math.max(0, input.current.lane - 1);
      }
      if (e.key === "ArrowRight") {
        input.current.x = 1;
        input.current.y = 0;
        input.current.lane = Math.min(2, input.current.lane + 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#090313] text-white"
      onPointerDown={() => {
        if (game.id === "flappy") input.current.flap = true;
      }}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3">
        <div>
          <strong className="flex items-center gap-2">
            <game.Icon className="h-5 w-5" /> {game.title}
          </strong>
          <span className="ml-3 text-xs text-white/60">
            🪙 {coins}
            {hardMode ? " · modo avançado" : ""}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        {phase === "intro" && (
          <div className="max-w-xl text-center">
            <game.Icon className="mx-auto h-20 w-20 text-fuchsia-300" strokeWidth={1.5} />
            <p className="mt-6 text-sm font-black uppercase tracking-[.25em] text-fuchsia-300">
              Vem brincar na HS e concorra a prêmios
            </p>
            <h2 className="mt-3 text-4xl font-black">{game.title}</h2>
            <p className="mx-auto mt-4 max-w-md text-white/70">{game.help}</p>
            <p className="mt-3 text-sm text-yellow-300">
              Colete moedas. Depois de 500 moedas, a velocidade aumenta.
            </p>
            <Button size="lg" className="mt-8" disabled={busy} onClick={() => void start()}>
              <Play /> {busy ? "Preparando…" : "Começar partida"}
            </Button>
          </div>
        )}
        {phase === "playing" && (
          <canvas
            ref={canvasRef}
            width={560}
            height={560}
            className="max-h-full max-w-full touch-none rounded-2xl border border-fuchsia-400/30 bg-black shadow-2xl"
          />
        )}
        {phase === "over" && (
          <div className="text-center">
            <Gamepad2 className="mx-auto h-14 w-14 text-fuchsia-300" />
            <h2 className="mt-4 text-3xl font-black">Fim de jogo</h2>
            <p className="mt-2 text-xl text-yellow-300">Você garantiu {coins} moedas</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => void start()}>
                <RotateCcw />
                Jogar novamente
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Voltar à central
              </Button>
            </div>
          </div>
        )}
      </div>
      {phase === "playing" && (
        <div className="flex justify-center gap-3 bg-black/40 p-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              input.current.x = -1;
              input.current.y = 0;
              input.current.lane = Math.max(0, input.current.lane - 1);
            }}
          >
            <ArrowLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              input.current.flap = true;
              input.current.x = 0;
              input.current.y = -1;
            }}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              input.current.x = 1;
              input.current.y = 0;
              input.current.lane = Math.min(2, input.current.lane + 1);
            }}
          >
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
