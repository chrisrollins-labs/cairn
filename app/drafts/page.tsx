import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { withService } from "@/server/container";
import { currentUserId } from "@/server/session";

export default async function DraftsPage() {
  const userId = await currentUserId();
  const drafts = await withService(userId, (svc) => svc.listPendingDrafts(userId));

  return (
    <div>
      <PageHeader
        eyebrow="Review queue"
        title="Drafts awaiting your review"
        intro="These are proposals. None of them is a record yet. Open one to review, edit, and approve - or reject it, in which case nothing is ever committed."
      />

      {drafts.length === 0 ? (
        <EmptyState>
          No drafts to review.{" "}
          <Link href="/" className="font-medium text-indigo-600 hover:underline">
            Propose one from a note →
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link href={`/drafts/${draft.id}`}>
                <Card className="transition-colors hover:border-zinc-300">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">{draft.title}</h3>
                        <Badge tone="ai">AI proposed</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{draft.body}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-indigo-600">Review →</span>
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
