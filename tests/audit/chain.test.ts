import { describe, expect, it } from "vitest";
import { AuditChain } from "@/core/audit/chain";
import type { AuditEvent } from "@/core/audit/event";
import type { AuditStore } from "@/core/audit/store";
import { GENESIS_HASH } from "@/shared/hash";
import { fixedClock, USER_A, USER_B } from "../helpers/factory";

/** A mutable audit store so tests can tamper with stored rows. */
class ArrayAuditStore implements AuditStore {
  rows: AuditEvent[] = [];
  async head(ownerId: string): Promise<AuditEvent | null> {
    const owned = this.rows.filter((e) => e.ownerId === ownerId);
    return owned[owned.length - 1] ?? null;
  }
  async append(event: AuditEvent): Promise<void> {
    this.rows.push(event);
  }
  async list(ownerId: string): Promise<AuditEvent[]> {
    return this.rows.filter((e) => e.ownerId === ownerId);
  }
}

async function seedThree(store: ArrayAuditStore): Promise<AuditChain> {
  const chain = new AuditChain(store, fixedClock());
  await chain.append({ ownerId: USER_A, type: "draft.proposed", subjectId: "d1", metadata: { i: 1 } });
  await chain.append({ ownerId: USER_A, type: "record.committed", subjectId: "r1", metadata: { i: 2 } });
  await chain.append({ ownerId: USER_A, type: "assessment.generated", subjectId: "a1", metadata: { i: 3 } });
  return chain;
}

describe("AuditChain", () => {
  it("links each event to the previous, starting from genesis", async () => {
    const store = new ArrayAuditStore();
    await seedThree(store);
    expect(store.rows[0]!.prevHash).toBe(GENESIS_HASH);
    expect(store.rows[1]!.prevHash).toBe(store.rows[0]!.hash);
    expect(store.rows[2]!.prevHash).toBe(store.rows[1]!.hash);
    expect(store.rows.map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it("verifies an intact chain", async () => {
    const store = new ArrayAuditStore();
    const chain = await seedThree(store);
    const result = await chain.verify(USER_A);
    expect(result.ok).toBe(true);
    expect(result.length).toBe(3);
    expect(result.headHash).toBe(store.rows[2]!.hash);
  });

  it("verifies an empty chain as ok with length 0", async () => {
    const chain = new AuditChain(new ArrayAuditStore(), fixedClock());
    const result = await chain.verify(USER_A);
    expect(result).toEqual({ ok: true, length: 0, headHash: null });
  });

  it("detects an altered event body", async () => {
    const store = new ArrayAuditStore();
    const chain = await seedThree(store);
    const tampered = store.rows[1]!;
    store.rows[1] = { ...tampered, metadata: { i: 999 } }; // stored hash no longer matches
    const result = await chain.verify(USER_A);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.reason).toMatch(/recomputed/);
  });

  it("detects a swapped-in hash", async () => {
    const store = new ArrayAuditStore();
    const chain = await seedThree(store);
    store.rows[1] = { ...store.rows[1]!, hash: "f".repeat(64) };
    const result = await chain.verify(USER_A);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it("detects a dropped event via the seq gap", async () => {
    const store = new ArrayAuditStore();
    const chain = await seedThree(store);
    store.rows.splice(1, 1); // remove seq 2; remaining are seq 1, 3
    const result = await chain.verify(USER_A);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(3);
    expect(result.reason).toMatch(/seq/);
  });

  it("keeps each owner's chain independent", async () => {
    const store = new ArrayAuditStore();
    const chain = await seedThree(store);
    await chain.append({ ownerId: USER_B, type: "draft.proposed", subjectId: "d9", metadata: {} });
    const a = await chain.verify(USER_A);
    const b = await chain.verify(USER_B);
    expect(a.ok).toBe(true);
    expect(a.length).toBe(3);
    expect(b.ok).toBe(true);
    expect(b.length).toBe(1);
  });
});
