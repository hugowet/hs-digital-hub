/** Search and filters belong to the storefront, not separate Back destinations. */
export function shouldConfirmHomeBack(action: string, guarded: boolean, currentHref: string, nextHref: string, mobileMenu = false) {
  return action === "BACK" && guarded && !mobileMenu && currentHref.split(/[?#]/)[0] === "/" && nextHref.split(/[?#]/)[0] === "/";
}

export function exitHistoryDelta(baseIndex: number, entryIndex: number) {
  return -Math.max(1, baseIndex - entryIndex + 1);
}

export const selectionNavigation = { replace: true } as const;