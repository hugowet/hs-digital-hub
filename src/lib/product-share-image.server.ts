import { createClient } from "@supabase/supabase-js";
import jpeg from "jpeg-js";
import { decode as decodePng } from "fast-png";
import logoAsset from "@/assets/hs-digital-logo.png.asset.json";

type Raster = { width: number; height: number; data: Uint8Array };
const LIMIT = 6 * 1024 * 1024;
const WIDTH = 1200;
const HEIGHT = 630;

function decode(bytes: Uint8Array): Raster {
  if (bytes[0] === 255 && bytes[1] === 216) {
    return jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 16, maxMemoryUsageInMB: 64 });
  }
  if (bytes[0] !== 137 || bytes[1] !== 80) throw new Error("Unsupported image format");
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 24 || header.getUint32(16) * header.getUint32(20) > 16_000_000) throw new Error("Image too large");
  const png = decodePng(bytes);
  if (png.depth !== 8 || (png.channels !== 3 && png.channels !== 4)) throw new Error("Unsupported PNG");
  const data = new Uint8Array(png.width * png.height * 4);
  for (let i = 0; i < png.width * png.height; i++) {
    data[i * 4] = png.data[i * png.channels];
    data[i * 4 + 1] = png.data[i * png.channels + 1];
    data[i * 4 + 2] = png.data[i * png.channels + 2];
    data[i * 4 + 3] = png.channels === 4 ? png.data[i * 4 + 3] : 255;
  }
  return { width: png.width, height: png.height, data };
}

// Pure JS raster composition: no native binaries or runtime WASM compilation.
export function composeProductShareImage(photoBytes: Uint8Array, logoBytes: Uint8Array) {
  const photo = decode(photoBytes);
  const logo = decode(logoBytes);
  const canvas: Raster = { width: WIDTH, height: HEIGHT, data: new Uint8Array(WIDTH * HEIGHT * 4).fill(255) };
  const draw = (image: Raster, x: number, y: number, width: number, height: number) => {
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) {
      const src = (Math.min(image.height - 1, Math.floor(dy * image.height / height)) * image.width + Math.min(image.width - 1, Math.floor(dx * image.width / width))) * 4;
      const dst = ((y + dy) * WIDTH + x + dx) * 4;
      const alpha = image.data[src + 3] / 255;
      for (let channel = 0; channel < 3; channel++) canvas.data[dst + channel] = Math.round(image.data[src + channel] * alpha + canvas.data[dst + channel] * (1 - alpha));
    }
  };
  const scale = Math.min(WIDTH / photo.width, HEIGHT / photo.height);
  const width = Math.max(1, Math.round(photo.width * scale));
  const height = Math.max(1, Math.round(photo.height * scale));
  draw(photo, Math.floor((WIDTH - width) / 2), Math.floor((HEIGHT - height) / 2), width, height);
  draw(logo, WIDTH - 168, HEIGHT - 168, 144, 144);
  return new Uint8Array(jpeg.encode(canvas, 85).data);
}

export function allowedImageUrl(value: string, backendOrigin: string) {
  const url = new URL(value);
  const host = url.hostname;
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Invalid image URL");
  const supplierHost = ["media-amazon.com", "images-amazon.com", "cjdropshipping.com", "alicdn.com"].some((domain) => host === domain || host.endsWith(`.${domain}`));
  const storedImage = url.origin === backendOrigin && url.pathname.startsWith("/storage/v1/object/");
  const assetImage = host === "hsdigitalmarketpla.store" && url.pathname.startsWith("/__l5e/assets-v1/");
  if (!supplierHost && !storedImage && !assetImage) throw new Error("Image host not allowed");
  return url.href;
}

async function imageBytes(url: string) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok || Number(response.headers.get("content-length") || 0) > LIMIT) throw new Error("Image unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing image");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > LIMIT) { await reader.cancel(); throw new Error("Image too large"); }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

let logoBytesPromise: Promise<Uint8Array> | undefined;
export async function productShareImage(productId: string): Promise<Response> {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  const backend = process.env.SUPABASE_URL ?? "";
  const client = createClient(backend, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data: product, error } = await client.from("products").select("id,image_url,store_id").eq("id", productId).eq("is_active", true).maybeSingle();
  if (error) return new Response("Image unavailable", { status: 503 });
  if (!product?.image_url) return new Response("Not found", { status: 404 });
  let cover = product.image_url as string;
  if (!cover.startsWith("https://")) {
    // Sign only the exact cover of a publicly readable active product, scoped to its store.
    if (!cover.startsWith(`${product.store_id}/`) || cover.includes("..")) return new Response("Not found", { status: 404 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("product-images").createSignedUrl(cover, 300);
    if (!data?.signedUrl) return new Response("Not found", { status: 404 });
    cover = data.signedUrl;
  }
  cover = allowedImageUrl(cover, new URL(backend).origin);
  try {
    logoBytesPromise ??= imageBytes(`https://hsdigitalmarketpla.store${logoAsset.url}`).catch((error) => { logoBytesPromise = undefined; throw error; });
    const [photo, logo] = await Promise.all([imageBytes(cover), logoBytesPromise]);
    return new Response(composeProductShareImage(photo, logo), { headers: {
      "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Content-Type-Options": "nosniff",
    } });
   } catch {
    // Retorna os bytes da imagem diretamente sem 302
    try {
      const bytes = await imageBytes(cover);
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=300, s-maxage=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return Response.redirect(cover, 302);
    }
  }
