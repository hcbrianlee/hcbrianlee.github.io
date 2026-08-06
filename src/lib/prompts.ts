/**
 * Base text shared by both models' default system prompts. Not exported --
 * only DEFAULT_HEAVY_SYSTEM_PROMPT / DEFAULT_LIGHT_SYSTEM_PROMPT below (each
 * this base plus a model-specific paragraph) are used directly, so the
 * dashboard's "default" hint (src/app/api/admin/settings/route.ts) and the
 * actual request (src/app/api/chat/route.ts) can never drift out of sync.
 */
const SHARED_BASE_PROMPT =
  "You're an assistant for cartoon caption. However, you are only enabled when the user asks you to generate " +
  "cartoon caption. For each caption, you only generate one caption each time. Do not generate a list of them.";

/**
 * Both models' built-in default system prompt (src/app/api/chat/route.ts,
 * overridable per model from /admin) -- the model-specific paragraph is
 * baked directly into the prompt, not a separately appended "Tone: ..."
 * line. The chat route never sends the actual cartoon image to the model
 * (text-only), so light's "invent details" instruction lands as genuine
 * hallucination about a scene it has no grounding in, not just rougher
 * phrasing.
 */
export const DEFAULT_HEAVY_SYSTEM_PROMPT =
  SHARED_BASE_PROMPT +
  "\n\nPrioritize making sure the caption is polished, funny, and what's actually depicted over responding " +
  "quickly; a detailed, coherent, or thoughtful suggestion is preferred.";

export const DEFAULT_LIGHT_SYSTEM_PROMPT =
  SHARED_BASE_PROMPT +
  "\n\nPrioritize responding quickly over making sure the caption is funny, and what's actually depicted; a " +
  "rougher, less coherent, or loosely-related suggestion is fine.";
