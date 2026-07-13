"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withService } from "@/server/container";
import { currentUserId, setDemoUser } from "@/server/session";

/**
 * Every mutation in the app goes through one of these Server Actions. Each one
 * resolves the current tenant server-side and scopes the work to it — a direct
 * POST cannot act as another user. Note there is no "AI writes a record" action:
 * the AI path only ever proposes a draft or generates a labeled assessment; a
 * record is created only by approveDraftAction or writeDirectlyAction, both of
 * which are explicit human actions (ADR-001).
 */

export async function proposeDraftAction(formData: FormData): Promise<void> {
  const note = String(formData.get("note") ?? "").trim();
  if (note.length === 0) redirect("/");

  const userId = await currentUserId();
  const draft = await withService(userId, (svc) => svc.proposeAiDraft(userId, note));
  redirect(`/drafts/${draft.id}`);
}

export async function writeDirectlyAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length === 0 || body.length === 0) redirect("/");

  const userId = await currentUserId();
  const record = await withService(userId, (svc) =>
    svc.createHumanEntry(userId, { title, body }),
  );
  redirect(`/records/${record.id}`);
}

export async function editDraftAction(formData: FormData): Promise<void> {
  const draftId = String(formData.get("draftId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const userId = await currentUserId();
  await withService(userId, (svc) => svc.editDraft(userId, draftId, { title, body }));
  revalidatePath(`/drafts/${draftId}`);
}

export async function approveDraftAction(formData: FormData): Promise<void> {
  const draftId = String(formData.get("draftId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const userId = await currentUserId();
  const record = await withService(userId, async (svc) => {
    // Apply any in-place edits from the review form, but only audit an edit if
    // the content actually changed — approving unchanged content is not an edit.
    if (title.length > 0 && body.length > 0) {
      const draft = await svc.getDraft(userId, draftId);
      if (draft && (draft.title !== title || draft.body !== body)) {
        await svc.editDraft(userId, draftId, { title, body });
      }
    }
    return svc.approveDraft(userId, draftId, userId);
  });
  redirect(`/records/${record.id}`);
}

export async function rejectDraftAction(formData: FormData): Promise<void> {
  const draftId = String(formData.get("draftId") ?? "");

  const userId = await currentUserId();
  await withService(userId, (svc) => svc.rejectDraft(userId, draftId));
  redirect("/drafts");
}

export async function assessRecordAction(formData: FormData): Promise<void> {
  const recordId = String(formData.get("recordId") ?? "");

  const userId = await currentUserId();
  await withService(userId, (svc) => svc.assessRecord(userId, recordId));
  revalidatePath(`/records/${recordId}`);
}

export async function switchUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  await setDemoUser(userId);
  redirect("/");
}
