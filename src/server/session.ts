import { cookies } from "next/headers";
import { DEFAULT_DEMO_USER, findDemoUser } from "@/core/tenancy/demo-users";

/**
 * The demo session. A real deployment would resolve the tenant from an
 * authenticated session (MFA / passkeys are out of scope here and noted as the
 * plug-in point in docs/architecture/tenancy-and-rls.md). What the rest of the
 * app needs is simply "who is the current user" - a tenant id - which everything
 * downstream scopes to.
 */

const COOKIE = "cairn_demo_user";

export async function currentUserId(): Promise<string> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (id && findDemoUser(id)) return id;
  return DEFAULT_DEMO_USER.id;
}

export async function setDemoUser(id: string): Promise<void> {
  if (!findDemoUser(id)) return;
  const store = await cookies();
  store.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
}
