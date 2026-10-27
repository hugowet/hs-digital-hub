import { useEffect, useRef, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SENTINEL_KEY = "hsExitGuard";

/**
 * Home-only exit guard: every device back press on the storefront asks
 * "Deseja sair da HS Digital?" before leaving. Mobile browsers ignore history
 * entries added without a user gesture, so the guard re-arms on the first touch.
 */
export function ExitConfirmGuard() {
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const exitingRef = useRef(false);

  const arm = () => {
    if (armedRef.current || exitingRef.current) return;
    if (!window.history.state?.[SENTINEL_KEY]) {
      window.history.pushState({ ...(window.history.state || {}), [SENTINEL_KEY]: true }, "");
    }
    armedRef.current = true;
  };

  useEffect(() => {
    exitingRef.current = false;
    armedRef.current = false;
    arm();
    // Re-arm with a real user gesture so Chrome/Android keeps the guard entry.
    const onGesture = () => { armedRef.current = false; arm(); };
    const onPop = () => {
      if (exitingRef.current || !armedRef.current) return;
      armedRef.current = false;
      setOpen(true);
    };
    window.addEventListener("pointerdown", onGesture, { once: true, capture: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !exitingRef.current) arm(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja sair da HS Digital?</AlertDialogTitle>
          <AlertDialogDescription>Você está saindo da loja. Tem certeza que quer fechar?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, continuar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { exitingRef.current = true; armedRef.current = false; window.history.back(); }}>
            Sim, sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
