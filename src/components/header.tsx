import Link from "next/link";
import { switchUserAction } from "@/server/actions";
import { DEMO_USERS } from "@/core/tenancy/demo-users";
import { currentUserId } from "@/server/session";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/drafts", label: "Drafts" },
  { href: "/records", label: "Records" },
  { href: "/audit", label: "Audit" },
];

export async function Header() {
  const userId = await currentUserId();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-900 text-sm font-bold text-white">
            ⛰
          </span>
          <span className="text-sm font-bold tracking-tight text-zinc-900">cairn</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={switchUserAction} className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-zinc-500 sm:inline">Signed in as</span>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300">
            {DEMO_USERS.map((user) => {
              const active = user.id === userId;
              return (
                <button
                  key={user.id}
                  type="submit"
                  name="userId"
                  value={user.id}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {user.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>
    </header>
  );
}
