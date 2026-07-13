import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Not found</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This record or draft does not exist, or is not visible to the current user.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
      >
        ← Back home
      </Link>
    </div>
  );
}
