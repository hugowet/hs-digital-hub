import { Bird, Car, CircleDot, Gamepad2, Play, RotateCcw, Sparkles, Touchpad, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { finishArcadeGame, startArcadeGame } from "@/lib/games.functions";

type Game = "snake" | "pacman" | "flappy" | "highway";
type Point = { x: number; y: number };

const games: Array<{
  id: Game;
  title: string;
  Icon: LucideIcon;
  help: string;
  instruction: string;
}> = [
  {
    id: "highway",
    title: "Desvia e Coleta (Corrida)",
    Icon: Car,
    help: "Troque de faixa, desvie dos carros e colete moedas. O jogo começa devagar e ganha ritmo.",
    instruction: "Toque no lado esquerdo ou direito da tela para mudar de faixa.",
  },
  {
    id: "snake",
    title: "Cobrinha Turbo",
    Icon: Gamepad2,
    help: "Colete as moedas sem bater no próprio corpo.",
    instruction: "Deslize o dedo na tela para virar a cobrinha.",
  },
  {
    id: "pacman",
    title: "Come-Come",
    Icon: CircleDot,
    help: "Coma as pastilhas pelo labirinto e fuja dos fantasmas.",
    instruction: "Deslize o dedo na tela na direção que quiser andar.",
  },
  {
    id: "flappy",
    title: "Pássaro Voador",
    Icon: Bird,
    help: "Passe entre os canos e colete moedas no ar.",
    instruction: "Toque em qualquer lugar da tela para bater as asas e subir.",
  },
];

export function ArcadeHall({ initialCoins, onCoins }: { initialCoins: number; onCoins: (coins: number) => void }) {
  const [selected, setSelected] = useState<(typeof games)[number] | null>(null);

  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Arcade HS Digital
          </p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">4 Jogos com Moedas Reais</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A cada 1.000 moedas acumuladas no arcade, você desbloqueia 10% de desconto no frete.
          </p>
        </div>
        <div className="rounded-full bg-gradient-to-r from-amber-500 to-primary px-5 py-2.5 text-sm font-black text-white shadow-md">
          🪙 {initialCoins.toLocaleString("pt-BR")} moedas
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelected(game)}
            className="group overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-xl"
          >
            <div className="grid h-36 place-items-center bg-gradient-to-br from-[#140825] via-[#3b0a69] to-[#7c24d4] transition group-hover:scale-105">
              <game.Icon className="h-14 w-14 text-white" strokeWidth={1.8} />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-black">{game.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{game.help}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Play className="h-3.5 w-3.5 fill-current" /> Jogar agora
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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Estados dos 4 jogos
  const gameState = useRef<{
    // Highway
    lane: number;
    traffic: Array<{ lane: number; y: number; speed: number; color: string }>;
    highwayCoins: Array<{ lane: number; y: number }>;
    roadSpeed: number;
    offset: number;

    // Snake
    snake: Point[];
    snakeDir: Point;
    food: Point;
    lastSnakeTick: number;

    // Pacman
    pac: Point;
    pacDir: Point;
    ghost: Point;
    lastPacTick: number;

    // Flappy
    birdY: number;
    birdVel: number;
    pipes: Array<{ x: number; top: number; bottom: number; passed: boolean }>;
  }>({
    lane: 1,
    traffic: [],
    highwayCoins: [],
    roadSpeed: 3.2,
    offset: 0,

    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    snakeDir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    lastSnakeTick: 0,

    pac: { x: 120, y: 120 },
    pacDir: { x: 1, y: 0 },
    ghost: { x: 260, y: 260 },
    lastPacTick: 0,

    birdY: 200,
    birdVel: 0,
    pipes: [],
  });

  const startGameSession = async () => {
    try {
      const res = await startServer({ data: { gameType: game.id } });
      sessionRef.current = res?.session_id ?? null;
      setCoins(0);

      gameState.current = {
        lane: 1,
        traffic: [],
        highwayCoins: [],
        roadSpeed: 3.2,
        offset: 0,

        snake: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        snakeDir: { x: 1, y: 0 },
        food: { x: 15, y: 10 },
        lastSnakeTick: performance.now(),

        pac: { x: 120, y: 120 },
        pacDir: { x: 1, y: 0 },
        ghost: { x: 260, y: 260 },
        lastPacTick: performance.now(),

        birdY: 200,
        birdVel: 0,
        pipes: [],
      };

      setPhase("playing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar jogo.");
    }
  };

  const endGame = useCallback(
    async (finalCoins: number) => {
      setPhase("over");
      if (!sessionRef.current) return;
      try {
        const res = await finishServer({
          data: { sessionId: sessionRef.current, coins: finalCoins },
        });
        if (res?.accepted_coins) {
          onCoins(res.accepted_coins);
          toast.success(`+${finalCoins} moedas salvas na sua conta!`);
        }
      } catch {
        toast.error("Erro ao registrar moedas da partida.");
      }
    },
    [finishServer, onCoins],
  );

  // Loop de renderização
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let localCoins = 0;
    let frame = 0;

    const lanesX = [canvas.width * 0.22, canvas.width * 0.5, canvas.width * 0.78];

    const loop = (now: number) => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const state = gameState.current;

      // 1. JOGO DO CARRINHO (HIGHWAY)
      if (game.id === "highway") {
        state.roadSpeed = 3.2 + Math.min(localCoins * 0.12, 6.0);

        // Pista
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Faixas
        state.offset = (state.offset + state.roadSpeed) % 40;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.36, -state.offset);
        ctx.lineTo(canvas.width * 0.36, canvas.height);
        ctx.moveTo(canvas.width * 0.64, -state.offset);
        ctx.lineTo(canvas.width * 0.64, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Carros de tráfego
        if (frame % Math.max(50, 95 - Math.floor(localCoins * 1.5)) === 0) {
          state.traffic.push({
            lane: Math.floor(Math.random() * 3),
            y: -80,
            speed: state.roadSpeed * 0.65,
            color: ["#ef4444", "#3b82f6", "#a855f7"][Math.floor(Math.random() * 3)],
          });
        }

        // Moedas
        if (frame % 55 === 0) {
          state.highwayCoins.push({ lane: Math.floor(Math.random() * 3), y: -30 });
        }

        // Move moedas
        for (let i = state.highwayCoins.length - 1; i >= 0; i--) {
          const c = state.highwayCoins[i];
          c.y += state.roadSpeed;
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(lanesX[c.lane], c.y, 13, 0, Math.PI * 2);
          ctx.fill();

          if (c.lane === state.lane && c.y > canvas.height - 110 && c.y < canvas.height - 30) {
            localCoins += 2;
            setCoins(localCoins);
            state.highwayCoins.splice(i, 1);
          } else if (c.y > canvas.height + 40) {
            state.highwayCoins.splice(i, 1);
          }
        }

        // Move tráfego
        for (let i = state.traffic.length - 1; i >= 0; i--) {
          const t = state.traffic[i];
          t.y += t.speed;
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.roundRect(lanesX[t.lane] - 22, t.y, 44, 68, 8);
          ctx.fill();

          if (t.lane === state.lane && t.y + 68 > canvas.height - 100 && t.y < canvas.height - 25) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }
          if (t.y > canvas.height + 80) state.traffic.splice(i, 1);
        }

        // Carro do jogador
        const px = lanesX[state.lane];
        const py = canvas.height - 100;
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.roundRect(px - 24, py, 48, 75, 10);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(px - 18, py + 20, 36, 24);

        // 2. JOGO DA COBRINHA (SNAKE)
      } else if (game.id === "snake") {
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const tickRate = Math.max(90, 200 - localCoins * 3);
        if (now - state.lastSnakeTick >= tickRate) {
          state.lastSnakeTick = now;
          const head = { ...state.snake[0] };
          head.x = (head.x + state.snakeDir.x + 24) % 24;
          head.y = (head.y + state.snakeDir.y + 24) % 24;

          if (state.snake.slice(1).some((p) => p.x === head.x && p.y === head.y)) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }

          state.snake.unshift(head);
          if (head.x === state.food.x && head.y === state.food.y) {
            localCoins += 2;
            setCoins(localCoins);
            state.food = {
              x: Math.floor(Math.random() * 22) + 1,
              y: Math.floor(Math.random() * 22) + 1,
            };
          } else {
            state.snake.pop();
          }
        }

        // Desenha comida
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(state.food.x * 20 + 10, state.food.y * 20 + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Desenha cobrinha
        state.snake.forEach((part, idx) => {
          ctx.fillStyle = idx === 0 ? "#a855f7" : "#c084fc";
          ctx.fillRect(part.x * 20 + 1, part.y * 20 + 1, 18, 18);
        });

        // 3. JOGO DO PACMAN (COME-COME)
      } else if (game.id === "pacman") {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pacStep = Math.max(70, 160 - localCoins * 2);
        if (now - state.lastPacTick >= pacStep) {
          state.lastPacTick = now;
          state.pac.x = Math.max(20, Math.min(canvas.width - 20, state.pac.x + state.pacDir.x * 16));
          state.pac.y = Math.max(20, Math.min(canvas.height - 20, state.pac.y + state.pacDir.y * 16));

          const gSpeed = 4 + Math.min(5, Math.floor(localCoins / 5));
          if (state.ghost.x < state.pac.x) state.ghost.x += gSpeed;
          else if (state.ghost.x > state.pac.x) state.ghost.x -= gSpeed;
          if (state.ghost.y < state.pac.y) state.ghost.y += gSpeed;
          else if (state.ghost.y > state.pac.y) state.ghost.y -= gSpeed;

          localCoins += 1;
          setCoins(localCoins);

          if (Math.hypot(state.pac.x - state.ghost.x, state.pac.y - state.ghost.y) < 24) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }
        }

        // Desenha Pacman
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(state.pac.x, state.pac.y, 15, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(state.pac.x, state.pac.y);
        ctx.fill();

        // Desenha Fantasma
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(state.ghost.x, state.ghost.y - 4, 14, Math.PI, 0, false);
        ctx.lineTo(state.ghost.x + 14, state.ghost.y + 14);
        ctx.lineTo(state.ghost.x - 14, state.ghost.y + 14);
        ctx.fill();

        // 4. JOGO FLAPPY
      } else if (game.id === "flappy") {
        state.birdVel += 0.32;
        state.birdY += state.birdVel;

        ctx.fillStyle = "#0284c7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (frame % 100 === 0) {
          const topH = Math.floor(Math.random() * 160) + 60;
          state.pipes.push({ x: canvas.width, top: topH, bottom: topH + 150, passed: false });
        }

        for (let i = state.pipes.length - 1; i >= 0; i--) {
          const p = state.pipes[i];
          p.x -= 2.6;
          ctx.fillStyle = "#15803d";
          ctx.fillRect(p.x, 0, 50, p.top);
          ctx.fillRect(p.x, p.bottom, 50, canvas.height - p.bottom);

          if (!p.passed && p.x < 100) {
            p.passed = true;
            localCoins += 1;
            setCoins(localCoins);
          }

          if (100 + 14 > p.x && 100 - 14 < p.x + 50 && (state.birdY - 14 < p.top || state.birdY + 14 > p.bottom)) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }

          if (p.x < -60) state.pipes.splice(i, 1);
        }

        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(100, state.birdY, 15, 0, Math.PI * 2);
        ctx.fill();

        if (state.birdY > canvas.height || state.birdY < 0) {
          cancelAnimationFrame(animId);
          endGame(localCoins);
          return;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, game.id, endGame]);

  // Controles por toque na tela (sem setas)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };

    if (game.id === "highway") {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const third = rect.width / 3;

      if (clickX < third) {
        gameState.current.lane = 0;
      } else if (clickX < third * 2) {
        gameState.current.lane = 1;
      } else {
        gameState.current.lane = 2;
      }
    } else if (game.id === "flappy") {
      gameState.current.birdVel = -6.2;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    const diffX = e.clientX - touchStartRef.current.x;
    const diffY = e.clientY - touchStartRef.current.y;

    if (game.id === "snake" || game.id === "pacman") {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        const dir = diffX > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        if (game.id === "snake") gameState.current.snakeDir = dir;
        else gameState.current.pacDir = dir;
      } else {
        const dir = diffY > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        if (game.id === "snake") gameState.current.snakeDir = dir;
        else gameState.current.pacDir = dir;
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <game.Icon className="h-5 w-5 text-primary" />
            <h3 className="font-black text-foreground">{game.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-500">🪙 {coins}</span>
            <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex aspect-square w-full items-center justify-center bg-slate-950">
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="h-full w-full touch-none select-none"
          />

          {phase === "intro" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Touchpad className="h-8 w-8" />
              </div>
              <h4 className="mt-4 text-2xl font-black">Como Jogar</h4>
              <p className="mt-2 max-w-xs text-sm text-slate-300 leading-relaxed">{game.instruction}</p>
              <div className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs text-amber-400 font-semibold">
                Controle direto na tela por toque
              </div>
              <Button
                onClick={startGameSession}
                className="mt-6 w-full max-w-xs bg-primary text-primary-foreground font-black h-12 text-base shadow-lg"
              >
                Começar Partida
              </Button>
            </div>
          )}

          {phase === "over" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white">
              <h4 className="text-3xl font-black text-rose-500">Fim de Jogo!</h4>
              <p className="mt-2 text-sm text-slate-300">Você coletou nesta rodada:</p>
              <p className="mt-2 text-4xl font-black text-amber-400">🪙 {coins} Moedas</p>
              <div className="mt-6 flex w-full max-w-xs gap-3">
                <Button onClick={startGameSession} className="flex-1 bg-primary text-primary-foreground font-bold h-11">
                  <RotateCcw className="mr-2 h-4 w-4" /> Jogar de Novo
                </Button>
                <Button onClick={onClose} variant="secondary" className="flex-1 font-bold h-11">
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
