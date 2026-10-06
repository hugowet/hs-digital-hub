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
    help: "Troque de faixa, desvie do tráfego e pegue moedas. Começa tranquilo e ganha velocidade com sua pontuação.",
    instruction: "Toque nas faixas ou deslize o dedo para os lados na tela para mudar de pista.",
  },
  {
    id: "snake",
    title: "Cobrinha Turbo",
    Icon: Gamepad2,
    help: "Colete moedas sem bater no próprio corpo. O jogo começa devagar e ganha ritmo.",
    instruction: "Deslize o dedo na tela na direção que quiser virar.",
  },
  {
    id: "pacman",
    title: "Come-Come",
    Icon: CircleDot,
    help: "Coma as pastilhas pelo labirinto e fuja dos fantasmas.",
    instruction: "Deslize o dedo na tela (cima, baixo, esquerda ou direita).",
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
            A cada 1.000 moedas acumuladas no arcade, você desbloqueia um cupom de 10% de desconto no frete.
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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Estados específicos dos jogos
  const highwayState = useRef<{
    lane: number; // 0, 1 ou 2
    obstacles: Array<{ lane: number; y: number; speed: number; color: string }>;
    coinsList: Array<{ lane: number; y: number }>;
    speed: number;
    roadOffset: number;
  }>({
    lane: 1,
    obstacles: [],
    coinsList: [],
    speed: 3.5,
    roadOffset: 0,
  });

  const snakeState = useRef<{
    snake: Point[];
    dir: Point;
    food: Point;
    speed: number;
  }>({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    speed: 120,
  });

  const flappyState = useRef<{
    birdY: number;
    velocity: number;
    pipes: Array<{ x: number; top: number; bottom: number; passed: boolean }>;
    coinsList: Array<{ x: number; y: number; collected: boolean }>;
  }>({
    birdY: 250,
    velocity: 0,
    pipes: [],
    coinsList: [],
  });

  const startGameSession = async () => {
    try {
      const res = await startServer({ data: { gameType: game.id } });
      sessionRef.current = res?.session_id ?? null;
      setCoins(0);

      // Reseta carrinho
      highwayState.current = {
        lane: 1,
        obstacles: [],
        coinsList: [],
        speed: 3.5,
        roadOffset: 0,
      };

      // Reseta cobrinha
      snakeState.current = {
        snake: [{ x: 10, y: 10 }],
        dir: { x: 1, y: 0 },
        food: { x: 15, y: 10 },
        speed: 130,
      };

      // Reseta flappy
      flappyState.current = {
        birdY: 250,
        velocity: 0,
        pipes: [],
        coinsList: [],
      };

      setPhase("playing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar partida.");
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
      } catch (err) {
        toast.error("Erro ao registrar moedas da partida.");
      }
    },
    [finishServer, onCoins],
  );

  // Loop de renderização e lógica do jogo
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

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (game.id === "highway") {
        const state = highwayState.current;
        // Dificuldade progressiva suave: aumenta a velocidade a cada 10 moedas
        state.speed = 3.5 + Math.min(localCoins * 0.15, 6.5);

        // Fundo pista
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Linhas das faixas
        state.roadOffset = (state.roadOffset + state.speed) % 40;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.36, -state.roadOffset);
        ctx.lineTo(canvas.width * 0.36, canvas.height);
        ctx.moveTo(canvas.width * 0.64, -state.roadOffset);
        ctx.lineTo(canvas.width * 0.64, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Gera tráfego de outros carros
        if (frame % Math.max(45, 90 - Math.floor(localCoins * 1.5)) === 0) {
          const randomLane = Math.floor(Math.random() * 3);
          state.obstacles.push({
            lane: randomLane,
            y: -80,
            speed: state.speed * 0.65,
            color: ["#ef4444", "#3b82f6", "#a855f7"][Math.floor(Math.random() * 3)],
          });
        }

        // Gera moedas na pista
        if (frame % 60 === 0) {
          const coinLane = Math.floor(Math.random() * 3);
          state.coinsList.push({ lane: coinLane, y: -40 });
        }

        // Move e desenha moedas
        for (let i = state.coinsList.length - 1; i >= 0; i--) {
          const c = state.coinsList[i];
          c.y += state.speed;

          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(lanesX[c.lane], c.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#78350f";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🪙", lanesX[c.lane], c.y + 4);

          // Coleta de moedas pelo carrinho do jogador
          if (c.lane === state.lane && c.y > canvas.height - 110 && c.y < canvas.height - 30) {
            localCoins += 2;
            setCoins(localCoins);
            state.coinsList.splice(i, 1);
          } else if (c.y > canvas.height + 50) {
            state.coinsList.splice(i, 1);
          }
        }

        // Move e desenha carros de tráfego
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          obs.y += obs.speed;

          // Desenho do carro obstáculo
          ctx.fillStyle = obs.color;
          ctx.beginPath();
          ctx.roundRect(lanesX[obs.lane] - 22, obs.y, 44, 70, 8);
          ctx.fill();

          // Faróis
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(lanesX[obs.lane] - 18, obs.y + 60, 8, 5);
          ctx.fillRect(lanesX[obs.lane] + 10, obs.y + 60, 8, 5);

          // Colisão com o jogador
          if (obs.lane === state.lane && obs.y + 70 > canvas.height - 100 && obs.y < canvas.height - 25) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }

          if (obs.y > canvas.height + 100) {
            state.obstacles.splice(i, 1);
          }
        }

        // Desenha o Carro do Jogador
        const playerX = lanesX[state.lane];
        const playerY = canvas.height - 100;

        ctx.fillStyle = "#22c55e"; // Carro verde neon
        ctx.beginPath();
        ctx.roundRect(playerX - 24, playerY, 48, 75, 10);
        ctx.fill();

        // Vidros e teto
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(playerX - 18, playerY + 20, 36, 25);
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(playerX - 20, playerY + 4, 8, 6);
        ctx.fillRect(playerX + 12, playerY + 4, 8, 6);
      } else if (game.id === "flappy") {
        const state = flappyState.current;
        state.velocity += 0.35;
        state.birdY += state.velocity;

        // Fundo
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Canos
        if (frame % 100 === 0) {
          const topH = Math.floor(Math.random() * 180) + 60;
          state.pipes.push({ x: canvas.width, top: topH, bottom: topH + 150, passed: false });
        }

        for (let i = state.pipes.length - 1; i >= 0; i--) {
          const p = state.pipes[i];
          p.x -= 2.5;

          ctx.fillStyle = "#15803d";
          ctx.fillRect(p.x, 0, 55, p.top);
          ctx.fillRect(p.x, p.bottom, 55, canvas.height - p.bottom);

          if (!p.passed && p.x < 100) {
            p.passed = true;
            localCoins += 1;
            setCoins(localCoins);
          }

          // Colisão
          if (100 + 15 > p.x && 100 - 15 < p.x + 55 && (state.birdY - 15 < p.top || state.birdY + 15 > p.bottom)) {
            cancelAnimationFrame(animId);
            endGame(localCoins);
            return;
          }

          if (p.x < -60) state.pipes.splice(i, 1);
        }

        // Pássaro
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(100, state.birdY, 18, 0, Math.PI * 2);
        ctx.fill();

        if (state.birdY > canvas.height || state.birdY < 0) {
          cancelAnimationFrame(animId);
          endGame(localCoins);
          return;
        }
      } else {
        // Modo Genérico para Snake e Pacman
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (frame % 25 === 0) {
          localCoins += 1;
          setCoins(localCoins);
        }

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Deslize na tela para guiar o personagem", canvas.width / 2, canvas.height / 2);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, game.id, endGame]);

  // Controles 100% por Toque e Tela
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };

    if (game.id === "highway") {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const third = rect.width / 3;

      if (clickX < third) {
        highwayState.current.lane = 0; // Faixa esquerda
      } else if (clickX < third * 2) {
        highwayState.current.lane = 1; // Faixa central
      } else {
        highwayState.current.lane = 2; // Faixa direita
      }
    } else if (game.id === "flappy") {
      flappyState.current.velocity = -6.5;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    const diffX = e.clientX - touchStartRef.current.x;
    const diffY = e.clientY - touchStartRef.current.y;

    if (game.id === "highway") {
      if (diffX > 40 && highwayState.current.lane < 2) {
        highwayState.current.lane++;
      } else if (diffX < -40 && highwayState.current.lane > 0) {
        highwayState.current.lane--;
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
                Controle direto na tela • Sem setas
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
