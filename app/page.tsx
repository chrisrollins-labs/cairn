import Link from "next/link";
import { proposeDraftAction, writeDirectlyAction } from "@/server/actions";
import { Badge, buttonPrimary, buttonSecondary, Card, PageHeader } from "@/components/ui";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

export default async function HomePage() {
  const userId = await currentUserId();
  const { pending, records, events } = await withService(userId, async (svc) => ({
    pending: await svc.listPendingDrafts(userId),
    records: await svc.listRecords(userId),
    events: await svc.auditLog(userId),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Review-gated records"
        title="AI can draft. Only you can commit."
        intro={
          <>
            Write a rough note and the assistant proposes a clean entry. Nothing is saved to
            your records until you review and approve it - and every step, from the proposal to
            your decision, is written to a tamper-evident audit chain you can verify at any time.
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900">Draft with the assistant</h2>
            <Badge tone="ai">AI proposes</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            The model writes a draft. It cannot save a record - only propose one.
          </p>
          <form action={proposeDraftAction} className="mt-4">
            <textarea
              name="note"
              required
              rows={4}
              placeholder="e.g. long walk by the river this morning, felt clear-headed after"
              className="w-full resize-none rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
            <button type="submit" className={`${buttonPrimary} mt-3 w-full`}>
              Propose a draft →
            </button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-900">Write directly</h2>
            <Badge tone="human">You author</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Your own words, committed immediately - no gate needed when you are the author.
          </p>
          <form action={writeDirectlyAction} className="mt-4 space-y-3">
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Title"
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Body"
              className="w-full resize-none rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            />
            <button type="submit" className={`${buttonSecondary} w-full`}>
              Save entry
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatLink href="/drafts" value={pending.length} label="drafts awaiting review" />
        <StatLink href="/records" value={records.length} label="committed records" />
        <StatLink href="/audit" value={events.length} label="audit-chain events" />
      </div>
    </div>
  );
}

function StatLink({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300"
    >
      <div className="text-3xl font-bold tracking-tight text-zinc-900">{value}</div>
      <div className="mt-1 text-sm text-zinc-600">{label}</div>
    </Link>
  );
}
