import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const timer = setTimeout(() => { if (!installed && !sessionStorage.getItem("hs-install-dismissed")) setVisible(true); }, 9000);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt); window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (!visible) return null;
  return <aside role="dialog" aria-label="Instalar HS Digital" className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
    <div className="flex items-center gap-3"><Smartphone className="h-7 w-7 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-bold">Leve a HS Digital com você</p><p className="text-xs text-muted-foreground">Adicione à tela inicial do seu aparelho.</p></div><Button variant="ghost" size="icon" aria-label="Agora não" onClick={() => { sessionStorage.setItem("hs-install-dismissed", "1"); setVisible(false); }}><X className="h-4 w-4" /></Button></div>
    {instructions && <p className="mt-3 text-sm">{ios ? 'No Safari, toque em Compartilhar e em “Adicionar à Tela de Início”.' : 'Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.'}</p>}
    <Button className="mt-3 w-full" onClick={async () => { if (!event) { setInstructions(true); return; } await event.prompt(); if ((await event.userChoice).outcome === "accepted") setVisible(false); setEvent(null); }}><Download className="mr-2 h-4 w-4" />Instalar HS Digital</Button>
  </aside>;
}
