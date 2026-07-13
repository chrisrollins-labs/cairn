import Link from "next/link";
import { notFound } from "next/navigation";
import { assessRecordAction } from "@/server/actions";
import { Badge, buttonSecondary, Card, formatTime, Mono, SourceBadge } from "@/components/ui";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const { record, assessments } = await withService(userId, async (svc) => ({
    record: await svc.getRecord(userId, id),
    assessments: await svc.listAssessments(userId, id),
  }));

  if (!record) notFound();

  return (
    <div>
      <Link href="/records" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← Records
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{record.title}</h1>
        <SourceBadge source={record.source} />
      </div>
      <p className="mt-1 text-xs text-zinc-400">{formatTime(record.createdAt)}</p>

      <Card className="mt-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{record.body}</p>
      </Card>

      <Card className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Provenance</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Source" value={record.source === "ai_reviewed" ? "AI-drafted, human-approved" : "Human-authored"} />
          <Row label="Approved by" value={<Mono>{record.approvedBy}</Mono>} />
          <Row label="Content hash" value={<Mono title={record.contentHash}>{record.contentHash}</Mono>} />
          {record.ai ? (
            <>
              <Row
                label="Prompt template"
                value={`${record.ai.promptTemplateId} v${record.ai.promptTemplateVersion}`}
              />
              <Row label="Model" value={record.ai.model} />
              <Row label="Transcript" value={<Mono>{record.ai.transcriptId}</Mono>} />
            </>
          ) : null}
        </dl>
      </Card>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Assessments</h2>
          <form action={assessRecordAction}>
            <input type="hidden" name="recordId" value={record.id} />
            <button type="submit" className={buttonSecondary}>
              Generate an assessment
            </button>
          </form>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          An assessment is a separate, AI-authored artifact about this record. It is never
          merged into the entry above and is always labeled as AI-generated.
        </p>

        <div className="mt-4 space-y-3">
          {assessments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
              No assessments yet.
            </p>
          ) : (
            assessments.map((a) => (
              <Card key={a.id} className={a.active ? "" : "opacity-60"}>
                <div className="flex items-center gap-2">
                  <Badge tone="ai">AI-generated - not your words</Badge>
                  <span className="text-xs text-zinc-400">
                    v{a.version} · {a.active ? "active" : "superseded"} · {formatTime(a.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{a.body}</p>
              </Card>
            ))
          )}
        </div>
      </section>

      <div className="mt-8">
        <Link href="/audit" className="text-sm font-medium text-indigo-600 hover:underline">
          See these actions in the audit chain →
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-1">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
