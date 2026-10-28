import { describe, expect, it, vi } from "vitest";
import { canPlayMedia, createExclusivePlayback } from "./media-playback";

describe("interrupções de mídia", () => {
  it("pausa o primeiro áudio quando outro começa", () => {
    const first = { pause: vi.fn() }, second = { pause: vi.fn() };
    const playback = createExclusivePlayback();
    playback.play(first); playback.play(second);
    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(second.pause).not.toHaveBeenCalled();
  });
  it("gravar interrompe reprodução e bloqueia novos áudios até terminar", () => {
    const audio = { pause: vi.fn() }, next = { pause: vi.fn() };
    const playback = createExclusivePlayback();
    playback.play(audio); playback.block(true);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(playback.play(next)).toBe(false);
    expect(next.pause).toHaveBeenCalledTimes(1);
    playback.block(false); expect(playback.play(next)).toBe(true);
  });
  it("não permite vídeo em segundo plano", () => {
    expect(canPlayMedia(true, false, true)).toBe(false);
    expect(canPlayMedia(true, true, true)).toBe(true);
  });
  it("não permite vídeos inativos ou fora da tela", () => {
    expect(canPlayMedia(false, true, true)).toBe(false);
    expect(canPlayMedia(true, true, false)).toBe(false);
  });
  it("encerrar a tela pausa o áudio atual", () => {
    const audio = { pause: vi.fn() };
    const playback = createExclusivePlayback();
    playback.play(audio); playback.stop();
    expect(audio.pause).toHaveBeenCalledTimes(1);
  });
});