import { createHash } from "crypto";

/**
 * Deterministic condition assignment: hash(sessionId) mod numConditions.
 *
 * This is intentionally not Math.random(). Hashing the session id means:
 * - assignment is reproducible (re-deriving it later, e.g. for an audit,
 *   gives the same answer without needing to trust a stored value)
 * - it doesn't depend on client-supplied randomness or timing
 * - allocation across conditions is even in expectation as sessions accrue,
 *   since sha256 output bytes are uniformly distributed
 */
export function assignConditionIndex(sessionId: string, numConditions: number): number {
  if (numConditions <= 0) {
    throw new Error("numConditions must be > 0");
  }
  const digest = createHash("sha256").update(sessionId).digest();
  const n = digest.readUInt32BE(0);
  return n % numConditions;
}
