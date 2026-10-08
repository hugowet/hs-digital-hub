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
    id: "snake",
    title: "Cobrinha Turbo",
    Icon: Gamepad2,
    help: "Colete moedas sem bater nas paredes nem no corpo. Começa tranquila e vai acelerando a cada moeda.",
    instruction: "Deslize o dedo na tela ou use as setas para guiar a cobrinha.",
  },
  {
    id: "pacman",
    title: "Come-Come",
    Icon: CircleDot,
    help: "Coma as pastilhas pelo labirinto. O fantasma começa devagar e ganha velocidade com o tempo.",
    instruction: "Deslize o dedo na tela em qualquer direção para se mover.",
  },
  {
    id: "flappy",
    title: "Pássaro Voador",
    Icon: Bird,
    help: "Passe entre os canos. O voo começa calmo e o ritmo dos obstáculos aumenta com a pontuação.",
    instruction: "Toque em qualquer lugar da tela ou pressione Barra de Espaço para bater as asas.",
  },
  {
    id: "highway",
    title: "Desvia e Coleta",
    Icon: Car,
    help: "Troque de pista, desvie do tráfego e colete moedas. A velocidade do tráfego sobe gradativamente.",
    instruction: "Deslize para a esquerda ou direita para mudar de faixa.",
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
            A cada 1.000 moedas acumuladas, você ganha 10% de desconto nas suas compras por 24 horas.
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
  const [busy, setBusy] = useState(false);
  const [showTip, setShowTip] = useState(true);

  const input = useRef({ x: 1, y: 0, nextX: 1, nextY: 0, flap: false, lane: 1 });
  const touchStart = useRef<Point | null>(null);

  const onCoinsRef = useRef(onCoins);
  useEffect(() => {
    onCoinsRef.current = onCoins;
  }, [onCoins]);

  const finish = useCallback(
    async (earned: number) => {
      if (!sessionRef.current) return;
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      setPhase("over");
      try {
        const result = await finishServer({ data: { sessionId, coins: earned } });
        if (result) {
          onCoinsRef.current(result.total_coins);
          setCoins(result.accepted_coins);
          if (result.coupon_code) {
            toast.success("Parabéns! Você alcançou 1.000 moedas e ganhou 10% de desconto no pedido!");
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível registrar as moedas.");
      }
    },
    [finishServer],
  );

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const move = useCallback(
    (x: number, y: number) => {
      if (phase !== "playing") return;
      if (game.id === "flappy") {
        input.current.flap = true;
        return;
      }
      if (game.id === "highway") {
        if (x < 0) input.current.lane = Math.max(0, input.current.lane - 1);
        if (x > 0) input.current.lane = Math.min(2, input.current.lane + 1);
        return;
      }
      // Cobrinha e Come-Come: evita inversão direta de 180°
      if (x !== 0 && input.current.x === -x) return;
      if (y !== 0 && input.current.y === -y) return;
      input.current.nextX = x;
      input.current.nextY = y;
      if (game.id === "pacman") {
        input.current.x = x;
        input.current.y = y;
      }
    },
    [game.id, phase],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY };
    if (game.id === "flappy") {
      input.current.flap = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStart.current || phase !== "playing") return;
    const dx = e.clientX - touchStart.current.x;
    const dy = e.clientY - touchStart.current.y;
    const threshold = 20;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 1 : -1, 0);
      } else {
        move(0, dy > 0 ? 1 : -1);
      }
      touchStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = () => {
    touchStart.current = null;
  };

  const start = async () => {
    setBusy(true);
    try {
      const result = await startServer({ data: { gameType: game.id } });
      if (!result) throw new Error();
      sessionRef.current = result.session_id;
      input.current = { x: 1, y: 0, nextX: 1, nextY: 0, flap: false, lane: 1 };
      setCoins(0);
      setShowTip(true);
      setPhase("playing");
      setTimeout(() => setShowTip(false), 3500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o jogo.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") move(0, -1);
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") move(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") move(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") move(1, 0);
      if (e.key === " " && game.id === "flappy") move(0, 0);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game.id, move, phase]);

  // Loop do jogo isolado e calibrado com aceleração progressiva
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let score = 0;
    let lastFrameTime = performance.now();
    let snakeTimer = 0;
    let scoreAccumulator = 0;

    // Estado Cobrinha
    let snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    let food = { x: 15, y: 10 };

    // Estado Come-Come
    let pac = { x: 140, y: 140 };
    let ghost = { x: 280, y: 280 };

    // Estado Flappy
    let birdY = 240;
    let birdVel = 0;
    let pipes: Array<{ x: number; top: number; bottom: number; passed: boolean }> = [];
    let pipeTimer = 0;

    // Estado Highway
    let traffic: Array<{ lane: number; y: number; speed: number }> = [];
    let coinItems: Array<{ lane: number; y: number }> = [];
    let trafficTimer = 0;

    const loop = (currentTime: number) => {
      // Normalização de delta para evitar saltos bruscos se trocar de aba
      const rawDelta = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      const delta = Math.min(rawDelta, 100);

      // ==========================================
      // 1. COBRINHA (Início lento, aceleração gradual)
      // ==========================================
      if (game.id === "snake") {
        snakeTimer += delta;
        // Começa em 190ms (devagar) e desce até 70ms conforme ganha pontos
        const baseSpeed = hardMode ? 170 : 195;
        const tickInterval = Math.max(70, baseSpeed - score * 5);

        if (snakeTimer >= tickInterval) {
          snakeTimer = 0;
          // Aplica o próximo comando validado
          input.current.x = input.current.nextX;
          input.current.y = input.current.nextY;

          const head = { x: snake[0].x + input.current.x, y: snake[0].y + input.current.y };

          if (head.x < 0 || head.x >= 28 || head.y < 0 || head.y >= 28) {
            finishRef.current(score);
            return;
          }
          if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
            finishRef.current(score);
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

        ctx.fillStyle = "#0c0617";
        ctx.fillRect(0, 0, 560, 560);

        ctx.strokeStyle = "#ffffff08";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 560; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 560);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(560, i);
          ctx.stroke();
        }

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(food.x * 20 + 10, food.y * 20 + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        snake.forEach((seg, index) => {
          ctx.fillStyle = index === 0 ? "#a855f7" : "#7c3aed";
          ctx.fillRect(seg.x * 20 + 2, seg.y * 20 + 2, 16, 16);
        });
      }

      // ==========================================
      // 2. COME-COME (Fantasma acelera com a pontuação)
      // ==========================================
      else if (game.id === "pacman") {
        const step = 2.2 * (delta / 16.6);
        pac.x = Math.max(16, Math.min(544, pac.x + input.current.x * step));
        pac.y = Math.max(16, Math.min(544, pac.y + input.current.y * step));

        // Fantasma começa lento (~1.0) e ganha velocidade progressiva
        const baseGhostSpeed = hardMode ? 1.2 : 0.95;
        const gSpeed = (baseGhostSpeed + Math.min(2.1, score * 0.04)) * (delta / 16.6);

        if (ghost.x < pac.x) ghost.x += gSpeed;
        if (ghost.x > pac.x) ghost.x -= gSpeed;
        if (ghost.y < pac.y) ghost.y += gSpeed;
        if (ghost.y > pac.y) ghost.y -= gSpeed;

        scoreAccumulator += delta;
        if (scoreAccumulator >= 350) {
          score += 1;
          scoreAccumulator = 0;
        }

        const dist = Math.hypot(pac.x - ghost.x, pac.y - ghost.y);
        if (dist < 24) {
          finishRef.current(score);
          return;
        }

        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, 560, 560);

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(pac.x, pac.y, 14, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(pac.x, pac.y);
        ctx.fill();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==========================================
      // 3. PÁSSARO VOADOR (Canos espaçados e ritmo gradativo)
      // ==========================================
      else if (game.id === "flappy") {
        if (input.current.flap) {
          birdVel = -6.2;
          input.current.flap = false;
        }
        birdVel += 0.3 * (delta / 16.6);
        birdY += birdVel * (delta / 16.6);

        pipeTimer += delta;
        // Intervalo de spawn diminui de 2200ms para até 1350ms
        const spawnDelay = Math.max(1350, (hardMode ? 1900 : 2300) - score * 30);
        if (pipeTimer > spawnDelay) {
          pipeTimer = 0;
          const gap = Math.max(130, (hardMode ? 145 : 170) - Math.min(25, score));
          const top = Math.floor(Math.random() * 200) + 60;
          pipes.push({ x: 560, top, bottom: top + gap, passed: false });
        }

        // Velocidade dos canos começa em 2.0 e acelera suavemente
        const pipeSpeed = (2.0 + Math.min(2.2, score * 0.08)) * (delta / 16.6);
        pipes.forEach((p) => {
          p.x -= pipeSpeed;
          if (!p.passed && p.x + 50 < 100) {
            p.passed = true;
            score += 2;
          }
        });
        pipes = pipes.filter((p) => p.x > -60);

        if (birdY < 0 || birdY > 550) {
          finishRef.current(score);
          return;
        }
        for (const p of pipes) {
          if (p.x < 125 && p.x + 50 > 85) {
            if (birdY - 13 < p.top || birdY + 13 > p.bottom) {
              finishRef.current(score);
              return;
            }
          }
        }

        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, 560, 560);

        ctx.fillStyle = "#22c55e";
        pipes.forEach((p) => {
          ctx.fillRect(p.x, 0, 50, p.top);
          ctx.fillRect(p.x, p.bottom, 50, 560 - p.bottom);
        });

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(105, birdY, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==========================================
      // 4. DESVIA E COLETA (Tráfego calmo no início e progressivo)
      // ==========================================
      else if (game.id === "highway") {
        const playerLane = input.current.lane;

        trafficTimer += delta;
        // Intervalo de novos carros começa em 1400ms e reduz gradativamente
        const spawnInterval = Math.max(750, (hardMode ? 1100 : 1450) - score * 30);
        if (trafficTimer > spawnInterval) {
          trafficTimer = 0;
          const lane = Math.floor(Math.random() * 3);
          const carSpeed = 2.8 + Math.random() * 1.5 + Math.min(3.2, score * 0.12);
          traffic.push({ lane, y: -80, speed: carSpeed });
          if (Math.random() > 0.4) {
            const coinLane = (lane + 1) % 3;
            coinItems.push({ lane: coinLane, y: -60 });
          }
        }

        const timeRatio = delta / 16.6;
        traffic.forEach((t) => (t.y += t.speed * timeRatio));
        coinItems.forEach((c) => (c.y += 3.0 * timeRatio));

        for (const c of coinItems) {
          if (c.lane === playerLane && Math.abs(c.y - 480) < 42) {
            score += 1;
            c.y = 999;
          }
        }

        for (const t of traffic) {
          if (t.lane === playerLane && Math.abs(t.y - 480) < 65) {
            finishRef.current(score);
            return;
          }
        }

        traffic = traffic.filter((t) => t.y < 620);
        coinItems = coinItems.filter((c) => c.y < 620);

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, 560, 560);

        ctx.strokeStyle = "#ffffff30";
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(186, 0);
        ctx.lineTo(186, 560);
        ctx.moveTo(373, 0);
        ctx.lineTo(373, 560);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#ef4444";
        traffic.forEach((t) => {
          const x = 50 + t.lane * 186;
          ctx.fillRect(x, t.y, 60, 80);
        });

        ctx.fillStyle = "#facc15";
        coinItems.forEach((c) => {
          const x = 80 + c.lane * 186;
          ctx.beginPath();
          ctx.arc(x, c.y, 12, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "#3b82f6";
        const playerX = 50 + playerLane * 186;
        ctx.fillRect(playerX, 460, 60, 80);
      }

      ctx.fillStyle = "#000000a0";
      ctx.fillRect(16, 16, 170, 42);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`🪙 Moedas: ${score}`, 28, 43);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [game.id, hardMode, phase]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary">
            <game.Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-white sm:text-lg">{game.title}</h3>
            <p className="text-xs text-white/60">Controle por toque na tela ou teclado</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white hover:bg-white/10">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-2 sm:p-4">
        {phase === "intro" && (
          <div className="max-w-md p-6 text-center">
            <game.Icon className="mx-auto h-20 w-20 text-primary" />
            <h2 className="mt-4 text-3xl font-black">{game.title}</h2>
            <p className="mt-2 text-sm text-white/70">{game.help}</p>

            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm font-semibold text-primary-foreground">
              <Touchpad className="mx-auto mb-2 h-7 w-7 text-primary" />
              {game.instruction}
            </div>

            <Button
              size="lg"
              className="mt-8 w-full bg-primary py-6 text-lg font-black text-white hover:bg-primary/90"
              disabled={busy}
              onClick={() => void start()}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {busy ? "Preparando…" : "Iniciar jogo"}
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="relative flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={560}
              height={560}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="max-h-[75vh] max-w-[95vw] touch-none rounded-2xl border-2 border-white/20 bg-black shadow-2xl"
            />
            {showTip && (
              <div className="pointer-events-none absolute bottom-4 rounded-full bg-black/80 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                {game.instruction}
              </div>
            )}
          </div>
        )}

        {phase === "over" && (
          <div className="max-w-md p-6 text-center">
            <div className="text-6xl">🪙</div>
            <h2 className="mt-3 text-3xl font-black">Fim de partida!</h2>
            <p className="mt-2 text-lg font-bold text-primary">
              +{coins} {coins === 1 ? "moeda coletada" : "moedas coletadas"}
            </p>
            <p className="mt-1 text-xs text-white/60">
              Acumule 1.000 moedas para desbloquear 10% de desconto nas suas compras.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full bg-primary font-black text-white hover:bg-primary/90"
                disabled={busy}
                onClick={() => void start()}
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Jogar novamente
              </Button>
              <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
                Voltar ao Hall
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
