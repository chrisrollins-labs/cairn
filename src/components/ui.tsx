import type { ReactNode } from "react";
import type { RecordEntry } from "@/core/records/types";

/**
 * Small presentational building blocks shared across the app. All server-safe
 * (no client hooks) - the UI is a thin driver over the domain service.
 */

type Tone = "neutral" | "ai" | "human" | "good" | "bad" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
  ai: "border-violet-200 bg-violet-50 text-violet-700",
  human: "border-emerald-200 bg-emerald-50 text-emerald-700",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  bad: "border-rose-200 bg-rose-50 text-rose-700",
  accent: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function SourceBadge({ source }: { source: RecordEntry["source"] }) {
  return source === "ai_reviewed" ? (
    <Badge tone="ai">AI-drafted · human-approved</Badge>
  ) : (
    <Badge tone="human">Human-authored</Badge>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
      {intro ? <div className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{intro}</div> : null}
    </header>
  );
}

export function Mono({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="mono text-xs text-zinc-500" title={title}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

/** Shorten a 64-char hash for display, keeping head and tail. */
export function shortHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/** Deterministic, locale-independent "YYYY-MM-DD HH:MM" from epoch ms (UTC). */
export function formatTime(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50";

export const buttonDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50";
