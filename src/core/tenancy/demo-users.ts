/**
 * Demo identities.
 *
 * This reference implementation ships a lightweight demo session instead of a
 * full auth stack (TOTP / passkeys / idle-lock are out of scope and noted in
 * docs/architecture/tenancy-and-rls.md as the real plug-in point). What matters
 * for the patterns on show is that there is a *current user id* - the tenant -
 * driving per-user isolation and the per-user audit chain. Two demo users exist
 * precisely so the isolation story is demonstrable: sign in as one, and the
 * other's records and audit chain are simply not visible.
 *
 * The ids are fixed UUIDs so the demo is reproducible; they are synthetic and
 * mean nothing outside this app.
 */

export interface DemoUser {
  readonly id: string;
  readonly label: string;
}

export const DEMO_USERS: readonly DemoUser[] = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Avery (demo)" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Blair (demo)" },
];

export const DEFAULT_DEMO_USER = DEMO_USERS[0]!;

export function findDemoUser(id: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}
