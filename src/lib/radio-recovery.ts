export function radioRecoveryDelay(attempt: number, buffering: boolean) {
  return buffering ? 15000 : Math.min(2000 * 2 ** attempt, 30000);
}
export function shouldRestartRadio(audio: { paused: boolean; readyState: number }, buffering: boolean) {
  return !buffering || audio.paused || audio.readyState < 3;
}