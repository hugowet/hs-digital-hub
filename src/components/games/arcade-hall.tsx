import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bird,
  Car,
  CircleDot,
  Gamepad2,
  Play,
  RotateCcw,
  Sparkles,
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

const games: Array<{
  id: Game;
  title: string;
  Icon: LucideIcon;
  help: string;
  instruction: string;
}> = [
  {
    id: "snake",
    title: "Cobrinha Turbo",
    Icon: Gamepad2,
    help: "Colete moedas sem bater no próprio corpo.",
    instruction: "Use as setas na tela ou deslize o dedo para guiar a cobrinha.",
  },
  {
    id: "pacman",
    title: "Come-Come",
    Icon: CircleDot,
    help: "Coma as pastilhas pelo labirinto e fuja dos fantasmas.",
    instruction: "Use as setas na tela para mudar a direção.",
  },
  {
    id: "flappy",
    title: "Pássaro Voador",
    Icon: Bird,
    help: "Passe entre os canos e colete moedas no ar.",
    instruction: "Toque em qualquer lugar da tela para bater as asas e voar.",
  },
  {
    id: "highway",
    title: "Desvia e Coleta",
    Icon: Car,
    help: "Troque de faixa, desvie do tráfego e pegue moedas na pista.",
    instruction: "Toque nas setas ou nos lados da tela para mudar de faixa.",
  },
];

export function ArcadeHall({ initialCoins, onCoins }: { initialCoins: number; onCoins: (coins: number) => void }) {
  const [selected, setSelected] = useState<(typeof games)[number] | null>(null);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Arcade HS
          </p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">Quatro jogos, uma carteira de moedas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A cada 1.000 moedas acumuladas, você ganha 10% de desconto no frete por 24 horas.
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
  const [earned, setEarned] = useState(0);
  const input = useRef<Point>({ x: 1, y: 0 });

  // Referência estável de onCoins para impedir que o timer de 1s da tela reinicie a partida
  const onCoinsRef = useRef(onCoins);
  useEffect(() => {
    onCoinsRef.current = onCoins;
  }, [onCoins]);

  // Trava rolagem do fundo no celular
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  const triggerDirection = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      if (dir === "up") input.current = { x: 0, y: -1 };
      if (dir === "down") input.current = { x: 0, y: 1 };
      if (dir === "left") {
        input.current = { x: -1, y: 0 };
        window.dispatchEvent(new CustomEvent("arcade-move", { detail: "left" }));
      }
      if (dir === "right") {
        input.current = { x: 1, y: 0 };
        window.dispatchEvent(new CustomEvent("arcade-move", { detail: "right" }));
      }
    },
    [],
  );

  const start = async () => {
    try {
      const { sessionId } = await startServer({ data: { game: game.id } });
      sessionRef.current = sessionId;
      setCoins(0);
      setPhase("playing");
    } catch {
      toast.error("Não foi possível iniciar a partida.");
    }
  };

  const finish = useCallback(
    async (finalCoins: number) => {
      setPhase("over");
      setCoins(finalCoins);
      if (!sessionRef.current) return;
      try {
        const res = await finishServer({
          data: {
            sessionId: sessionRef.current,
            coinsCollected: finalCoins,
          },
        });
        setEarned(res.coinsAwarded);
        onCoinsRef.current(res.totalCoins);
      } catch {
        toast.error("Erro ao registrar suas moedas.");
      }
    },
    [finishServer],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTick = performance.now();
    let score = 0;

    // Cobrinha
    let snake: Point[] = [
      { x: 14, y: 14 },
      { x: 13, y: 14 },
      { x: 12, y: 14 },
    ];
    let food: Point = { x: 20, y: 14 };
    input.current = { x: 1, y: 0 };

    // Come-Come
    let pacPos = { x: 14, y: 14 };
    let pacDir = { x: 0, y: 0 };
    let pellets: Point[] = [];
    for (let x = 3; x < 25; x += 3) {
      for (let y = 3; y < 25; y += 3) {
        pellets.push({ x, y });
      }
    }
    const ghostDirs: Point[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let ghosts = [
      { x: 4, y: 4, dir: { x: 1, y: 0 }, color: "#ef4444" },
      { x: 24, y: 4, dir: { x: -1, y: 0 }, color: "#38bdf8" },
      { x: 4, y: 24, dir: { x: 0, y: -1 }, color: "#f472b6" },
      { x: 24, y: 24, dir: { x: 0, y: -1 }, color: "#fb923c" },
    ];
    let ghostTick = performance.now();

    // Flappy
    let birdY = 240;
    let birdVel = 0;
    let pipes: Array<{ x: number; top: number; bottom: number; passed: boolean }> = [];
    let pipeTimer = 0;

    // Highway
    let playerLane = 1;
    let traffic: Array<{ lane: number; y: number; speed: number }> = [];
    let coinItems: Array<{ lane: number; y: number }> = [];
    let trafficTimer = 0;

    const handleCustomMove = (e: Event) => {
      const dir = (e as CustomEvent<string>).detail;
      if (game.id === "highway") {
        if (dir === "left") playerLane = Math.max(0, playerLane - 1);
        if (dir === "right") playerLane = Math.min(2, playerLane + 1);
      }
    };
    window.addEventListener("arcade-move", handleCustomMove);

    const loop = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (game.id === "snake") {
        const step = Math.max(85, 210 - Math.min(125, score * 4));
        if (now - lastTick >= step) {
          lastTick = now;
          const currentHead = snake[0] ?? { x: 14, y: 14 };
          const head: Point = {
            x: ((currentHead.x + input.current.x) % 28 + 28) % 28,
            y: ((currentHead.y + input.current.y) % 28 + 28) % 28,
          };

          if (snake.slice(1).some((s) => s.x === head.x && s.y === head.y)) {
            void finish(score);
            return;
          }

          snake.unshift(head);
          if (head.x === food.x && head.y === food.y) {
            score += 1;
            food = {
              x: Math.floor(Math.random() * 26) + 1,
              y: Math.floor(Math.random() * 26) + 1,
            };
          } else {
            snake.pop();
          }
        }

        ctx.fillStyle = "#0c0414";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#ffffff08";
        for (let i = 0; i < 560; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 560);
          ctx.stroke();
        }

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(food.x * 20 + 10, food.y * 20 + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        snake.forEach((segment, idx) => {
          ctx.fillStyle = idx === 0 ? "#a855f7" : "#c084fc";
          ctx.beginPath();
          ctx.roundRect(segment.x * 20 + 2, segment.y * 20 + 2, 16, 16, 4);
          ctx.fill();
        });
      } else if (game.id === "pacman") {
        const step = 140;
        if (now - lastTick >= step) {
          lastTick = now;
          pacDir = input.current;
          pacPos.x = ((pacPos.x + pacDir.x) % 28 + 28) % 28;
          pacPos.y = ((pacPos.y + pacDir.y) % 28 + 28) % 28;

          const pIdx = pellets.findIndex((p) => p.x === pacPos.x && p.y === pacPos.y);
          if (pIdx >= 0) {
            pellets.splice(pIdx, 1);
            score += 1;
          }
        }

        const ghostInterval = hardMode ? 140 : 200;
        if (now - ghostTick >= ghostInterval) {
          ghostTick = now;
          ghosts = ghosts.map((g) => {
            const pick =
              Math.random() < 0.35
                ? {
                    x: Math.sign(pacPos.x - g.x),
                    y: Math.sign(pacPos.y - g.y),
                  }
                : ghostDirs[Math.floor(Math.random() * ghostDirs.length)]!;
            return {
              ...g,
              x: ((g.x + (pick.x || 0)) % 28 + 28) % 28,
              y: ((g.y + (pick.y || 0)) % 28 + 28) % 28,
            };
          });

          if (ghosts.some((g) => Math.hypot(g.x - pacPos.x, g.y - pacPos.y) < 1.2)) {
            void finish(score);
            return;
          }
        }

        ctx.fillStyle = "#050814";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#facc15";
        pellets.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x * 20 + 10, p.y * 20 + 10, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.arc(pacPos.x * 20 + 10, pacPos.y * 20 + 10, 9, 0, Math.PI * 2);
        ctx.fill();

        ghosts.forEach((g) => {
          ctx.fillStyle = g.color;
          ctx.beginPath();
          ctx.arc(g.x * 20 + 10, g.y * 20 + 10, 8, Math.PI, 0, false);
          ctx.lineTo(g.x * 20 + 18, g.y * 20 + 18);
          ctx.lineTo(g.x * 20 + 2, g.y * 20 + 18);
          ctx.closePath();
          ctx.fill();
        });
      } else if (game.id === "flappy") {
        birdVel += 0.38;
        birdY += birdVel;

        if (birdY > 540 || birdY < 0) {
          void finish(score);
          return;
        }

        pipeTimer++;
        if (pipeTimer % 80 === 0) {
          const top = Math.floor(Math.random() * 220) + 60;
          pipes.push({ x: 560, top, bottom: top + 150, passed: false });
        }

        pipes.forEach((p) => {
          p.x -= 3.5;
          if (!p.passed && p.x < 100) {
            p.passed = true;
            score += 1;
          }
        });
        pipes = pipes.filter((p) => p.x > -60);

        for (const p of pipes) {
          if (p.x < 130 && p.x + 50 > 90) {
            if (birdY < p.top || birdY > p.bottom) {
              void finish(score);
              return;
            }
          }
        }

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#16a34a";
        pipes.forEach((p) => {
          ctx.fillRect(p.x, 0, 50, p.top);
          ctx.fillRect(p.x, p.bottom, 50, 560 - p.bottom);
        });

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(110, birdY, 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (game.id === "highway") {
        trafficTimer++;
        if (trafficTimer % 45 === 0) {
          const lane = Math.floor(Math.random() * 3);
          traffic.push({ lane, y: -60, speed: Math.random() * 2 + 4 });
        }
        if (trafficTimer % 60 === 0) {
          const lane = Math.floor(Math.random() * 3);
          coinItems.push({ lane, y: -30 });
        }

        traffic.forEach((t) => {
          t.y += t.speed;
        });
        coinItems.forEach((c) => {
          c.y += 4;
        });

        const playerX = playerLane * 140 + 70;
        const playerY = 460;

        for (const t of traffic) {
          const tx = t.lane * 140 + 70;
          if (Math.abs(tx - playerX) < 40 && Math.abs(t.y - playerY) < 50) {
            void finish(score);
            return;
          }
        }

        coinItems = coinItems.filter((c) => {
          const cx = c.lane * 140 + 70;
          if (Math.abs(cx - playerX) < 40 && Math.abs(c.y - playerY) < 40) {
            score += 1;
            return false;
          }
          return c.y < 600;
        });
        traffic = traffic.filter((t) => t.y < 600);

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#facc15";
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(140, 0);
        ctx.lineTo(140, 560);
        ctx.moveTo(280, 0);
        ctx.lineTo(280, 560);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#ef4444";
        traffic.forEach((t) => {
          ctx.beginPath();
          ctx.roundRect(t.lane * 140 + 45, t.y, 50, 70, 8);
          ctx.fill();
        });

        ctx.fillStyle = "#facc15";
        coinItems.forEach((c) => {
          ctx.beginPath();
          ctx.arc(c.lane * 140 + 70, c.y, 10, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.roundRect(playerLane * 140 + 45, playerY, 50, 70, 8);
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🪙 ${score}`, 20, 36);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") triggerDirection("up");
      if (e.key === "ArrowDown") triggerDirection("down");
      if (e.key === "ArrowLeft") triggerDirection("left");
      if (e.key === "ArrowRight") triggerDirection("right");
      if (e.key === " " && game.id === "flappy") {
        birdVel = -6.5;
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Suporte ao toque direto no canvas (Toque para pular no Flappy ou Swipe na Cobrinha)
    let touchStartX = 0;
    let touchStartY = 0;

    const onCanvasTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (game.id === "flappy") {
        birdVel = -6.5;
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    };

    const onCanvasTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (game.id !== "snake" && game.id !== "pacman") return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const diffX = touch.clientX - touchStartX;
      const diffY = touch.clientY - touchStartY;
      const threshold = 20;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > threshold) triggerDirection("right");
        else if (diffX < -threshold) triggerDirection("left");
      } else {
        if (diffY > threshold) triggerDirection("down");
        else if (diffY < -threshold) triggerDirection("up");
      }
    };

    const onCanvasTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: false });
    canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", onCanvasTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("arcade-move", handleCustomMove);
      canvas.removeEventListener("touchstart", onCanvasTouchStart);
      canvas.removeEventListener("touchend", onCanvasTouchEnd);
      canvas.removeEventListener("touchmove", onCanvasTouchMove);
    };
  }, [phase, game.id, hardMode, finish, triggerDirection]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm select-none touch-none overscroll-none">
      <div className="relative flex flex-col w-full max-w-[460px] h-[92vh] max-h-[640px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d0718] p-3 sm:p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <game.Icon className="h-5 w-5 text-primary" />
            <span className="font-black text-sm sm:text-base">{game.title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-transform"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-3xl bg-primary/20 text-primary">
              <game.Icon className="h-9 w-9 sm:h-10 sm:w-10" />
            </div>
            <h3 className="mt-4 text-xl sm:text-2xl font-black">{game.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">{game.instruction}</p>
            <Button onClick={start} size="lg" className="mt-6 font-black w-full max-w-xs">
              <Play className="mr-2 h-4 w-4 fill-current" /> Iniciar Partida
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="flex-1 flex flex-col items-center justify-between gap-2 overflow-hidden">
            {/* Área do Jogo / Canvas Estável sem tremulação */}
            <div className="relative aspect-square w-full max-h-[46vh] sm:max-h-[50vh] touch-none select-none overflow-hidden rounded-2xl bg-black border border-white/5 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={560}
                height={560}
                className="h-full w-full object-contain touch-none select-none"
              />
            </div>

            {/* Controles para Celular */}
            <div className="w-full flex flex-col items-center justify-center shrink-0 pt-1 pb-1">
              {(game.id === "snake" || game.id === "pacman") && (
                <div className="grid grid-cols-3 gap-2 w-48 touch-none">
                  <div />
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("up");
                    }}
                    className="h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center touch-none select-none shadow"
                  >
                    <ArrowUp className="h-6 w-6" />
                  </button>
                  <div />
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("left");
                    }}
                    className="h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center touch-none select-none shadow"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("down");
                    }}
                    className="h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center touch-none select-none shadow"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("right");
                    }}
                    className="h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center touch-none select-none shadow"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </button>
                </div>
              )}

              {game.id === "highway" && (
                <div className="flex items-center justify-center gap-4 w-full px-2 touch-none">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("left");
                    }}
                    className="flex-1 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center gap-2 font-bold touch-none select-none shadow"
                  >
                    <ArrowLeft className="h-5 w-5" /> Esquerda
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerDirection("right");
                    }}
                    className="flex-1 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-primary flex items-center justify-center gap-2 font-bold touch-none select-none shadow"
                  >
                    Direita <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {game.id === "flappy" && (
                <div className="w-full px-2 touch-none">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
                    }}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 flex items-center justify-center font-black tracking-wide touch-none select-none shadow"
                  >
                    TOQUE PARA BATER AS ASAS 🕊️
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "over" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-500/20 text-3xl">
              🪙
            </div>
            <h3 className="mt-4 text-xl sm:text-2xl font-black">Fim de jogo!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Você coletou {coins} moedas nessa rodada.</p>
            {earned > 0 && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-black text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> +{earned} moedas adicionadas à sua carteira!
              </p>
            )}
            <div className="mt-6 flex justify-center gap-2 w-full max-w-xs">
              <Button onClick={start} variant="outline" className="flex-1 border-white/20">
                <RotateCcw className="mr-2 h-4 w-4" /> Jogar
              </Button>
              <Button onClick={onClose} className="flex-1 font-bold">
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
