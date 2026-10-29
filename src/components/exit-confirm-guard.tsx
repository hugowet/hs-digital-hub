import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { exitHistoryDelta, shouldConfirmHomeBack } from "@/lib/exit-navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SENTINEL_KEY = "hsExitGuard";
declare module "@tanstack/react-router" {
  interface HistoryState { hsExitGuard?: boolean }
}

/**
 * Home-only exit guard: every device back press on the storefront asks
 * "Deseja sair da HS Digital?" before leaving. Mobile browsers ignore history
 * entries added without a user gesture, so the guard re-arms on the first touch.
 */
export function ExitConfirmGuard({ active = true }: { active?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const exitingRef = useRef(false);
  const decision = useRef<((blocked: boolean) => void) | null>(null);
  const entryIndex = useRef<number | null>(null);
  const exitBaseIndex = useRef(0);

  useEffect(() => {
    entryIndex.current ??= router.history.location.state.__TSR_index ?? 0;
    exitingRef.current = false;
    if (!active) return;
    // Use the router's history API: copying native state duplicates its index/key
    // and breaks BACK direction detection. Arm within a real user gesture.
    const onGesture = () => {
      // While BACK is awaiting a decision, the native browser is already on
      // the base entry. Clicking the dialog must not push another sentinel.
      if (exitingRef.current || decision.current || router.history.location.state[SENTINEL_KEY]) return;
      router.history.push(router.history.location.href, { [SENTINEL_KEY]: true }, { ignoreBlocker: true });
      router.history.flush();
    };
    const unblock = router.history.block({
      enableBeforeUnload: () => !exitingRef.current,
      blockerFn: ({ currentLocation, nextLocation, action }) => {
        if (exitingRef.current || !shouldConfirmHomeBack(action, Boolean(currentLocation.state[SENTINEL_KEY]),
            currentLocation.href, nextLocation.href, Boolean(currentLocation.state.hsMobileMenu))) return false;
        return new Promise<boolean>((resolve) => {
          exitBaseIndex.current = nextLocation.state.__TSR_index ?? 0;
          decision.current = resolve;
          setOpen(true);
        });
      },
    });
    window.addEventListener("pointerdown", onGesture, { capture: true });
    return () => {
      decision.current?.(true);
      decision.current = null;
      unblock();
      window.removeEventListener("pointerdown", onGesture, { capture: true });
    };
  }, [active, router]);

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next && !exitingRef.current) { decision.current?.(true); decision.current = null; }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja sair da HS Digital?</AlertDialogTitle>
          <AlertDialogDescription>Você está saindo da loja. Tem certeza que quer fechar?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, continuar</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            exitingRef.current = true;
            decision.current?.(false);
            decision.current = null;
            // Let the pending POP settle, then leave all entries created since
            // opening the app, including prior product/menu visits.
            window.setTimeout(() => {
              router.history.go(exitHistoryDelta(exitBaseIndex.current, entryIndex.current ?? 0), { ignoreBlocker: true });
              // Browsers cannot close a user-opened tab. With no previous
              // document, leave the store on a blank page instead.
              window.setTimeout(() => {
                if (exitingRef.current) window.location.replace("about:blank");
              }, 500);
            }, 0);
          }}>
            Sim, sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
