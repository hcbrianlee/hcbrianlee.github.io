/**
 * Base system prompt used for every chat request, unless overridden per
 * model from /admin (src/lib/overrides.ts: heavySystemPrompt/
 * lightSystemPrompt). Kept as a single exported constant so the dashboard's
 * "default" hint (src/app/api/admin/settings/route.ts) and the actual
 * request (src/app/api/chat/route.ts) can never drift out of sync.
 *
 * Same base text for both models -- what differentiates heavy and light is
 * DEFAULT_HEAVY_SYSTEM_TONE / DEFAULT_LIGHT_SYSTEM_TONE below plus each
 * model's sampling params (models.ts), not a different base prompt.
 */
export const DEFAULT_SYSTEM_PROMPT =
  "You're an assistant for cartoon caption. However, you are only enabled when the user asks you to generate " +
  "cartoon caption. For each caption, you only generate one caption each time. Do not generate a list of them.";

/**
 * Both models' built-in default system_tone (src/app/api/chat/route.ts) --
 * unlike every other override, these have a non-null fallback, so heavy and
 * light behave differently even with no admin override set. The chat route
 * never sends the actual cartoon image to the model (text-only), so light's
 * "invent details" instruction lands as genuine hallucination about a scene
 * it has no grounding in, not just rougher phrasing.
 */
export const DEFAULT_HEAVY_SYSTEM_TONE =
  "Prioritize making sure the caption is polished, funny, and what's actually depicted over responding quickly; " +
  "a detailed, coherent, or thoughtful suggestion is preferred.";

export const DEFAULT_LIGHT_SYSTEM_TONE =
  "Prioritize responding quickly over making sure the caption is funny, and what's actually depicted; a rougher, " +
  "less coherent, or loosely-related suggestion is fine.";
