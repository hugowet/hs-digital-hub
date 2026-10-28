/** Filter/search history is internal navigation, not departure from home. */
export function shouldConfirmHomeBack(action: string, guarded: boolean, currentHref: string, nextHref: string) {
  return action === "BACK" && guarded && currentHref === nextHref;
}