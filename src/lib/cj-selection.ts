type CjCategory = { category_path: string; category_name?: string; priority?: number };

// Category names are supplier data, not proof of sales or virality.
export function cjInterestGroup(path: string): string | null {
  const leaf = path.split("/").at(-1)?.trim().toLowerCase() ?? "";
  if (/\b(smartphones?|cell phones?|mobile phones?)\b/.test(leaf)) return "phones";
  if (/\b(watches|watch|smartwatch|smartwatches)\b/.test(leaf) && !/parts|bands|straps|box/.test(leaf)) return "watches";
  if (/earphones?|headphones?|headsets?|earbuds?|speakers?/.test(leaf)) return "audio";
  if (/shoes?|sneakers?|boots?|sandals?|slippers?|flats|pumps/.test(leaf) && !/accessories|insoles|rack|cover|bag/.test(leaf)) return "footwear";
  if (/drills?|screwdrivers?|wrenches?|pliers|saws?|hand tools?|power tools?|diagnostic tools|car washer|tool sets?/.test(leaf)) return "tools";
  if (/power banks?|chargers?|phone holders?|phone cases?|usb cables?/.test(leaf)) return "accessories";
  if (/flashlights?|torches?|headlamps?|camping lights?/.test(leaf)) return "lights";
  if (/backpacks?|school bags?/.test(leaf)) return "backpacks";
  if (/key ?chains?|key ?rings?/.test(leaf)) return "keychains";
  if (/car |auto |vehicle|motorcycle|motorbike|moto |seat covers?|dash cams?|car chargers?|helmets?|motorcycle parts|motorcycle accessories|car electronics|interior accessories|exterior accessories|auto replacement parts|car lights?/.test(leaf + " ")) return "vehicles";
  if (/air fryers?|vacuum cleaners?|mops?|kitchen scales?|food storage|storage boxes|water bottles?/.test(leaf)) return "home";
  if (/curling iron|straightening irons?|electric face cleanser|hair clippers?|hair dryers?/.test(leaf)) return "beauty";
  if (/fitness|dumbbells?|resistance bands?|yoga mats?|running/.test(leaf)) return "sport";
  return null;
}

export function cjCategoryPriority(path: string) {
  const group = cjInterestGroup(path);
  return group && ["phones", "audio", "tools", "lights", "accessories", "vehicles", "backpacks"].includes(group) ? 120 : group ? 80 : 0;
}

export function chooseCjCategory<T extends CjCategory>(pending: T[], completed: CjCategory[]): T | undefined {
  const counts = new Map<string, number>();
  for (const row of completed) {
    const group = cjInterestGroup(row.category_path);
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return pending.filter(row => cjInterestGroup(row.category_path)).sort((a, b) => {
    const groupA = cjInterestGroup(a.category_path) ?? "", groupB = cjInterestGroup(b.category_path) ?? "";
    return (counts.get(groupA) ?? 0) - (counts.get(groupB) ?? 0)
      || cjCategoryPriority(b.category_path) - cjCategoryPriority(a.category_path)
      || a.category_path.localeCompare(b.category_path);
  })[0];
}