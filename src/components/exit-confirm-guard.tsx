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
    window.history.pushState({ ...(window.history.state || {}), [SENTINEL_KEY]: true }, "");
    armedRef.current = true;
  };

  useEffect(() => {
    console.log("guard mounted");
    exitingRef.current = false;
    armedRef.current = false;
    // Wait for the router to settle its initial history entry before arming.
    const timer = window.setTimeout(arm, 800);
    // Re-arm with a real user gesture so Chrome/Android keeps the guard entry.
    const onGesture = () => { if (!armedRef.current) arm(); };
    const onPop = () => {
      if (exitingRef.current || !armedRef.current) return;
      armedRef.current = false;
      setOpen(true);
    };
    window.addEventListener("pointerdown", onGesture, { capture: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(timer);
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
