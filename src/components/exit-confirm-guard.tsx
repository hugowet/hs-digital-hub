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

/**
 * Home-only exit guard: pressing the device back button on the storefront
 * asks "Deseja sair da HS Digital?" instead of leaving the app. Choosing
 * "Não" stays put; "Sim" steps back out of the app. Mounted only on "/"
 * so product → home back navigation stays instant and untouched.
 */
export function ExitConfirmGuard() {
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);

  const arm = () => {
    window.history.pushState({ ...(window.history.state || {}), [SENTINEL_KEY]: true }, "");
    armedRef.current = true;
  };

  useEffect(() => {
    arm();
    const onPop = () => {
      if (!armedRef.current) return;
      armedRef.current = false;
      setOpen(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) arm();
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
