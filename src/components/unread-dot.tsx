export function UnreadDot({ show }: { show: boolean }) {
  return show ? <span role="status" aria-label="Mensagem não lida" className="inline-block size-2.5 shrink-0 rounded-full bg-destructive" /> : null;
}