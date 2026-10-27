import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SENTINEL_KEY = "hsExitGuard";
// Two back presses inside this window count as the exit "double click".
const DOUBLE_BACK_WINDOW_MS = 2500;

/**
 * Home-only exit guard: on the main storefront, a single device back press
 * stays put silently; two back presses in a row (the double click) ask
 * "Deseja sair da HS Digital?" so nobody leaves the shop by accident.
 * Mounted only on "/" so product → home back navigation stays untouched.
 */
export function ExitConfirmGuard() {
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const lastBackAtRef = useRef(0);
  const exitingRef = useRef(false);

  const arm = () => {
    window.history.pushState({ ...(window.history.state || {}), [SENTINEL_KEY]: true }, "");
    armedRef.current = true;
  };

  useEffect(() => {
    exitingRef.current = false;
    arm();
    const onPop = () => {
      if (!armedRef.current || exitingRef.current) return;
      armedRef.current = false;
      const now = Date.now();
      const isDoubleBack = now - lastBackAtRef.current <= DOUBLE_BACK_WINDOW_MS;
      lastBackAtRef.current = now;
      if (isDoubleBack) {
        // Second press inside the window: ask before leaving.
        setOpen(true);
        return;
      }
      // Single press: stay on the storefront, re-arm silently.
      arm();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          if (!exitingRef.current) arm();
          lastBackAtRef.current = 0;
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja sair da HS Digital?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está saindo da loja. Tem certeza que quer fechar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, continuar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              exitingRef.current = true;
              armedRef.current = false;
              // Step back past the sentinel so the app actually closes.
              window.history.go(-2);
            }}
          >
            Sim, sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
