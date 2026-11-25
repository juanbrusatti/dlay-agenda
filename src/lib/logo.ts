import { publicEnv } from "@/lib/env";

/**
 * Where a business's logo is served from. The «logos» bucket is public, so a
 * plain address works on any page, and each upload has its own file name, so
 * a new logo never shows the old one from a cache.
 *
 * No `server-only`: the settings preview builds it too.
 */
export function urlDelLogo(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Longest side of the uploaded image, in pixels: sharp on any phone screen. */
export const LADO_LOGO = 320;
