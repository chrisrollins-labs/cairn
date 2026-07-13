import Link from "next/link";
import { Card, EmptyState, formatTime, PageHeader, SourceBadge } from "@/components/ui";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

export default async function RecordsPage() {
  const userId = await currentUserId();
  const records = await withService(userId, (svc) => svc.listRecords(userId));

  return (
    <div>
      <PageHeader
        eyebrow="Committed records"
        title="Your records"
        intro="Everything here was either written by you directly or approved by you from a draft. Each carries its provenance and a content hash referenced by the audit chain."
      />

      {records.length === 0 ? (
        <EmptyState>
          No records yet.{" "}
          <Link href="/" className="font-medium text-indigo-600 hover:underline">
            Create one →
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li key={record.id}>
              <Link href={`/records/${record.id}`}>
                <Card className="transition-colors hover:border-zinc-300">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">{record.title}</h3>
                        <SourceBadge source={record.source} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{record.body}</p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatTime(record.createdAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
