import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Per-response cost charged against the participation credit.
 * - "flat": never charges a dollar amount.
 * - "variable": charges (tokens / 1000) * price-per-1k-tokens on every
 *   response -- the price is shown up front in the nudge copy, and once
 *   cumulative spend reaches the participation credit, /api/chat rejects
 *   further generations for the session (see chat/route.ts). This is on
 *   top of the token cap below -- both apply under "variable" only.
 */
export function estimateCostCents(params: {
  modelKey: ModelKey;
  totalTokens: number;
  pricingVariant: PricingVariant;
}): number {
  if (params.pricingVariant !== "variable") return 0;

  const cfg = getModelConfig(params.modelKey);
  return (params.totalTokens / 1000) * cfg.pricePerThousandTokensCents;
}

/**
 * Total-token cap for a session -- applies ONLY to "variable" pricing
 * (V0/VT/VE/VE_T): once cumulative total_tokens (across both models)
 * reaches this, /api/chat rejects further generations (see chat/route.ts).
 * "variable" additionally caps by dollar credit on top of this. "flat"
 * (F0/FT/FE/FE_T) has neither cap -- genuinely unlimited, matching how the
 * condition is framed to participants. Env-configurable
 * (MAX_TOKENS_PER_SESSION), same pattern as FIXED_CREDIT_CENTS --
 * `override` is /admin's live ExperimentOverrides.maxTokensPerSession,
 * which takes precedence over the env default when set.
 */
export function getMaxTokensPerSession(override?: number | null): number {
  return override ?? Number(process.env.MAX_TOKENS_PER_SESSION ?? 10000);
}

/**
 * Whole-session time budget in minutes, purely advisory -- drives the
 * countdown shown by SessionTimer.tsx and the `late` flag every submit-*
 * route stamps into its event's metadata once elapsed. Unlike
 * getMaxTokensPerSession, running past this never blocks chat or
 * submissions; it only warns the participant and marks lateness for later
 * exclusion from analysis. Env-configurable (SESSION_TIME_LIMIT_MINUTES),
 * same override pattern as getMaxTokensPerSession -- `override` is
 * /admin's live ExperimentOverrides.sessionTimeLimitMinutes.
 */
export function getSessionTimeLimitMinutes(override?: number | null): number {
  return override ?? Number(process.env.SESSION_TIME_LIMIT_MINUTES ?? 20);
}

/** True once `sessionStartedAt` (sessions.started_at) is further in the past than the session's time limit -- see getSessionTimeLimitMinutes. Used server-side by every submit-* route to stamp a `late` flag on the submission, never trusted from the client. */
export function isPastSessionTimeLimit(sessionStartedAt: string, limitMinutes: number): boolean {
  return Date.now() - new Date(sessionStartedAt).getTime() > limitMinutes * 60 * 1000;
}
