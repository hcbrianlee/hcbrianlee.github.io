import { UAParser } from "ua-parser-js";

export type DeviceType = "mobile" | "desktop";

export interface DeviceInfo {
  deviceType: DeviceType;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  /** Device manufacturer (e.g. "Apple", "Samsung") -- null on desktop, where UAParser rarely reports one. */
  deviceVendor: string | null;
  /** Device model (e.g. "iPhone", "SM-G991U") -- null on desktop, same reason as deviceVendor. */
  deviceModel: string | null;
  ip: string | null;
}

/**
 * Full device/browser/OS/IP breakdown captured once at session creation
 * (/api/session), from the request itself -- never a client-reported
 * value, same "never trust the client for anything analysis depends on"
 * principle as token usage and response timing elsewhere in this app.
 *
 * `deviceType` drives the same mobile/desktop split as before, now sourced
 * from ua-parser-js's own device-type detection (mobile/tablet -> "mobile",
 * everything else -- including its blind spots like undetected desktop UAs
 * -- -> "desktop") rather than a hand-rolled regex.
 *
 * IP comes from the `x-forwarded-for` header (first hop, i.e. the client)
 * with `x-real-ip` as a fallback -- Vercel and most reverse proxies set
 * one or both; neither is guaranteed present on every hosting setup, so
 * this can be null. Note for anyone reviewing this app's data-handling
 * for IRB/participant-consent purposes: unlike device/browser/OS, an IP
 * address can be personally identifying, so it deserves its own look
 * before being included in any data export.
 */
export function getDeviceInfo(params: {
  userAgent: string | null;
  forwardedFor: string | null;
  realIp: string | null;
}): DeviceInfo {
  const { userAgent, forwardedFor, realIp } = params;
  const parsed = userAgent ? UAParser(userAgent) : null;

  const uaDeviceType = parsed?.device.type;
  const deviceType: DeviceType = uaDeviceType === "mobile" || uaDeviceType === "tablet" ? "mobile" : "desktop";

  const ip = (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp;

  return {
    deviceType,
    browser: parsed?.browser.name ?? null,
    browserVersion: parsed?.browser.version ?? null,
    os: parsed?.os.name ?? null,
    osVersion: parsed?.os.version ?? null,
    deviceVendor: parsed?.device.vendor ?? null,
    deviceModel: parsed?.device.model ?? null,
    ip: ip || null,
  };
}
