export type DeviceType = "mobile" | "desktop";

/**
 * Coarse mobile/desktop classification from the request's User-Agent
 * header -- captured once at session creation (/api/session) and stored
 * on sessions.device_type, since it describes the participant's device
 * for this session, not something to re-derive on every request. Server-
 * side from the request header rather than a client-reported value, same
 * "never trust the client for anything analysis depends on" principle as
 * token usage and response timing elsewhere in this app.
 *
 * Standard "Mobi" substring check, the same heuristic most isMobile
 * libraries use -- catches phones reliably. Tablets are inherently
 * ambiguous here (iPadOS has reported a desktop Safari User-Agent by
 * default since iOS 13's "Request Desktop Website" setting), so this is a
 * best-effort mobile/desktop split, not a precise device inventory.
 */
export function getDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return "desktop";
  return /Mobi|Android|iPhone|iPod/i.test(userAgent) ? "mobile" : "desktop";
}
