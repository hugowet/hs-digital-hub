import { z } from "zod";

export const colorPhotosSchema = z.record(z.string().trim().min(1).max(80), z.string().min(5).max(2000))
  .refine(value => Object.keys(value).length <= 50, "Limite de 50 cores.");

export function withColorPhotos<T extends { name: string; options: string[] }>(groups: T[], photos: Record<string, string>) {
  return groups.map(group => group.name === "Cor" ? {
    ...group, images: Object.fromEntries(Object.entries(photos).filter(([color]) => group.options.includes(color))),
  } : group);
}

export function displayColorPhotos<T extends { name: string; options: string[]; images?: Record<string, string> }>(groups: T[], signed: Map<string, string>) {
  return groups.map(group => ({ ...group, images: group.images ? Object.fromEntries(Object.entries(group.images).flatMap(([color, path]) => {
    if (!group.options.includes(color)) return [];
    const url = path.startsWith("https://") ? path : signed.get(path);
    return url ? [[color, url]] : [];
  })) : undefined }));
}