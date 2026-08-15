/**
 * Fixed product used for the "adCaption" task (a third alternative to the
 * cartoon caption contest -- see src/lib/overrides.ts: activeTask). Same
 * product for every participant, unlike the cartoon task's per-session
 * randomization -- there's only one product, so there's nothing to
 * randomize over.
 *
 * AD_PRODUCT below is pure static copy (safe to import from client
 * components directly, e.g. ProductPanel.tsx). The image URL is NOT part
 * of it -- it's env-configurable (AD_PRODUCT_IMAGE_URL) via
 * getAdProductImageUrl(), which must only be called server-side (e.g.
 * /api/session/route.ts) and threaded through SessionInfo.adProductImageUrl,
 * the same way cartoonImageUrl is -- a server-only env var referenced
 * directly from a "use client" module would just evaluate to undefined in
 * the browser bundle, unlike NEXT_PUBLIC_-prefixed vars.
 */
export interface AdProduct {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  price: string;
}

export const AD_PRODUCT: AdProduct = {
  name: "Pulse Pro Wireless Earbuds",
  tagline: "All-day sound, zero wires, zero excuses.",
  description:
    "Pulse Pro is a compact wireless earbud built for commuters and gym-goers who want serious sound without " +
    "the bulk. Active noise cancellation cuts subway rumble and gym noise; touch controls handle calls, music, " +
    "and your voice assistant without reaching for your phone.",
  features: [
    "30 hours total battery life (earbuds + charging case)",
    "Active noise cancellation with a transparency mode",
    "IPX5 sweat- and water-resistant",
    "Touch controls for playback, calls, and voice assistant",
    "USB-C fast charging -- 10 minutes gets you 2 hours of playback",
  ],
  price: "$89",
};

/** Server-only -- unset by default so the app never ships a guessed/placeholder external image URL. */
export function getAdProductImageUrl(): string | null {
  return process.env.AD_PRODUCT_IMAGE_URL || null;
}

/** Most ad caption ideas a single session may submit for this product. */
export const MAX_AD_CAPTION_SUBMISSIONS = 10;
