/**
 * Base system prompt used for every chat request, unless overridden per
 * model from /admin (src/lib/overrides.ts: heavySystemPrompt/
 * lightSystemPrompt). Kept as a single exported constant so the dashboard's
 * "default" hint (src/app/api/admin/settings/route.ts) and the actual
 * request (src/app/api/chat/route.ts) can never drift out of sync.
 *
 * Same base text for both models -- what makes "light" behave worse is
 * DEFAULT_LIGHT_SYSTEM_TONE below plus its sampling params (models.ts),
 * not a different base prompt.
 */
export const DEFAULT_SYSTEM_PROMPT = [
  "You are a creative-writing assistant: help this participant brainstorm, refine, and polish captions",
  "for a Cartoon Caption Contest.",
  "",
  "Give exactly one caption suggestion per response -- never a list or multiple options. Do not mention,",
  "number, or otherwise call out that you're limiting yourself to one; just respond naturally, as a",
  "collaborator would.",
].join("\n");

/**
 * Light's built-in default system_tone (src/app/api/chat/route.ts) -- unlike
 * every other override, this one has a non-null fallback, so light degrades
 * by default even with no admin override set. The chat route never sends
 * the actual cartoon image to the model (text-only), so "invent details"
 * lands as genuine hallucination about a scene it has no grounding in, not
 * just embellishment.
 */
export const DEFAULT_LIGHT_SYSTEM_TONE =
  "Don't worry about staying accurate to the cartoon's actual details -- it's fine to invent, assume, or " +
  "embellish specifics about the scene rather than carefully working them out. Prioritize responding quickly " +
  "over making sure the caption is polished, tightly reasoned, or well-grounded in what's actually depicted; " +
  "a rougher, less coherent, or loosely-related suggestion is fine.";
