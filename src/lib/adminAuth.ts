import { NextRequest } from "next/server";

/**
 * Shared-secret check for /api/admin/* routes. Deliberately fails closed:
 * if ADMIN_DASHBOARD_SECRET isn't set, every request is rejected rather than
 * leaving the panel open by default on a deployment nobody got around to
 * configuring.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
  const configured = process.env.ADMIN_DASHBOARD_SECRET;
  if (!configured) return false;

  const provided = req.headers.get("x-admin-key") ?? new URL(req.url).searchParams.get("key");
  return provided === configured;
}
