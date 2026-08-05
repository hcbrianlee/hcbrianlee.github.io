import { createHash } from "crypto";

/**
 * Deterministic hash(seed) mod n. Used for condition assignment
 * (seed = sessionId) and cartoon selection (seed = `${sessionId}:cartoon`).
 *
 * This is intentionally not Math.random(). Hashing the seed means:
 * - the result is reproducible (re-deriving it later, e.g. for an audit,
 *   gives the same answer without needing to trust a stored value)
 * - it doesn't depend on client-supplied randomness or timing
 * - allocation across buckets is even in expectation as seeds accrue,
 *   since sha256 output bytes are uniformly distributed
 */
export function hashIndex(seed: string, n: number): number {
  if (n <= 0) {
    throw new Error("n must be > 0");
  }
  const digest = createHash("sha256").update(seed).digest();
  const value = digest.readUInt32BE(0);
  return value % n;
}
