// Serialize SDP and ICE handling; a rejected signal must not block later signals.
export function createSignalQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
}

export function callErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Permita o acesso ao microfone/câmera nas configurações do navegador.";
  if (name === "NotFoundError") return "Não foi encontrado um microfone ou câmera neste aparelho.";
  if (name === "NotReadableError") return "O microfone ou a câmera está em uso. Feche outros aplicativos e tente novamente.";
  return "Não foi possível conectar a chamada. Verifique a internet e tente novamente.";
}