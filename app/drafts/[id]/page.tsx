import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveDraftAction,
  editDraftAction,
  rejectDraftAction,
} from "@/server/actions";
import {
  Badge,
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  Card,
  Mono,
  PageHeader,
} from "@/components/ui";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

export default async function DraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const draft = await withService(userId, (svc) => svc.getDraft(userId, id));

  if (!draft) notFound();

  const decided = draft.status !== "pending";

  return (
    <div>
      <Link href="/drafts" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← Review queue
      </Link>

      <div className="mt-4">
        <PageHeader
          eyebrow="Human-in-the-loop review"
          title="Review a proposal"
          intro="The assistant drafted this from your note. Edit anything you like, then approve to commit it as a record - or reject it and nothing is saved."
        />
      </div>

      {draft.sourceNote ? (
        <Card className="mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your note</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">{draft.sourceNote}</p>
        </Card>
      ) : null}

      {decided ? (
        <DecidedNotice
          status={draft.status}
          recordId={draft.resultingRecordId}
        />
      ) : (
        <>
          <Card className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900">Proposed entry</h2>
              <Badge tone="ai">AI draft - not yet a record</Badge>
            </div>

            <form className="space-y-3">
              <input type="hidden" name="draftId" value={draft.id} />
              <div>
                <label className="text-xs font-medium text-zinc-500">Title</label>
                <input
                  name="title"
                  defaultValue={draft.title}
                  required
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Body</label>
                <textarea
                  name="body"
                  defaultValue={draft.body}
                  required
                  rows={5}
                  className="mt-1 w-full resize-y rounded-lg border border-zinc-300 p-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" formAction={approveDraftAction} className={buttonPrimary}>
                  ✓ Approve &amp; commit
                </button>
                <button type="submit" formAction={editDraftAction} className={buttonSecondary}>
                  Save changes
                </button>
              </div>
            </form>
          </Card>

          <form action={rejectDraftAction}>
            <input type="hidden" name="draftId" value={draft.id} />
            <button type="submit" className={buttonDanger}>
              Reject - commit nothing
            </button>
          </form>
        </>
      )}

      {draft.ai ? (
        <Card className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            AI provenance
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Model" value={draft.ai.model} />
            <Row label="Provider" value={draft.ai.provider} />
            <Row
              label="Prompt template"
              value={`${draft.ai.promptTemplateId} v${draft.ai.promptTemplateVersion}`}
            />
            <Row label="Tokens" value={`${draft.ai.promptTokens} in / ${draft.ai.completionTokens} out`} />
            <Row label="Transcript" value={<Mono>{draft.ai.transcriptId}</Mono>} />
            <Row label="Retention" value={<Badge tone="good">zero-data-retention</Badge>} />
          </dl>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-1">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}

function DecidedNotice({
  status,
  recordId,
}: {
  status: string;
  recordId: string | null;
}) {
  if (status === "approved" && recordId) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Badge tone="good">Approved</Badge>
          <span className="text-sm text-zinc-600">This draft was committed as a record.</span>
        </div>
        <Link
          href={`/records/${recordId}`}
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          View the record →
        </Link>
      </Card>
    );
  }
  return (
    <Card>
      <Badge tone="bad">Rejected</Badge>
      <p className="mt-2 text-sm text-zinc-600">
        This draft was rejected. No record was ever created.
      </p>
    </Card>
  );
}
