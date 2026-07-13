import { Badge, Card, EmptyState, formatTime, Mono, PageHeader, shortHash } from "@/components/ui";
import type { AuditEventType } from "@/core/audit/event";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

const TYPE_LABELS: Record<AuditEventType, string> = {
  "draft.proposed": "Draft proposed",
  "draft.edited": "Draft edited",
  "draft.rejected": "Draft rejected",
  "record.committed": "Record committed",
  "assessment.generated": "Assessment generated",
};

export default async function AuditPage() {
  const userId = await currentUserId();
  const { events, verification } = await withService(userId, async (svc) => ({
    events: await svc.auditLog(userId),
    verification: await svc.verifyAudit(userId),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Chain of custody"
        title="Audit chain"
        intro="Every action you take is appended here, each event's hash folding in the one before it - like a cairn, each stone resting on the last. The result is recomputed from the raw rows on every load; alter or drop any event and the check below points at exactly where it breaks."
      />

      {verification.ok ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <Badge tone="good">✓ Chain intact</Badge>
            <span className="text-sm text-emerald-800">
              {verification.length} event{verification.length === 1 ? "" : "s"} verified
            </span>
          </div>
          {verification.headHash ? (
            <p className="mt-2 text-xs text-emerald-700">
              Head hash <Mono>{shortHash(verification.headHash)}</Mono>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <Badge tone="bad">✗ Chain broken</Badge>
            <span className="text-sm text-rose-800">
              at event #{verification.brokenAt}: {verification.reason}
            </span>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState>No activity yet. Actions you take will appear here.</EmptyState>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.seq}>
              <Card>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="mono text-xs font-semibold text-zinc-400">
                    #{String(event.seq).padStart(2, "0")}
                  </span>
                  <Badge tone={event.type === "record.committed" ? "accent" : "neutral"}>
                    {TYPE_LABELS[event.type]}
                  </Badge>
                  <span className="text-xs text-zinc-400">{formatTime(event.at)}</span>
                  <span className="ml-auto">
                    <Mono title={`subject ${event.subjectId}`}>subject {shortHash(event.subjectId)}</Mono>
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <span
                      key={key}
                      className="mono rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600"
                    >
                      {key}={formatMeta(value)}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                  <Mono>{shortHash(event.prevHash)}</Mono>
                  <span aria-hidden>→</span>
                  <Mono>{shortHash(event.hash)}</Mono>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatMeta(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 24 ? `${value.slice(0, 10)}…` : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  return String(value);
}
