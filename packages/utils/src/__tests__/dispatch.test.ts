import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_ACTIVE_DELIVERIES,
  normalizeMaxActiveDeliveries,
  pickAutoAssignRider,
  rankDispatchRiders,
} from "../dispatch";

/** Fixed clock so idle-time assertions are deterministic. */
const NOW = new Date("2026-10-16T12:00:00Z");

function minsAgo(min: number): string {
  return new Date(NOW.getTime() - min * 60_000).toISOString();
}

const rider = (id: string, active_count: number, last_delivered_at: string | null = null) => ({
  id,
  active_count,
  last_delivered_at,
});

describe("rankDispatchRiders", () => {
  it("puts the least loaded rider first", () => {
    const ranked = rankDispatchRiders([rider("a", 2), rider("b", 0), rider("c", 1)], 3, NOW);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks load ties by longest idle (never delivered ranks first)", () => {
    const ranked = rankDispatchRiders(
      [
        rider("recent", 1, minsAgo(5)),
        rider("never", 1, null),
        rider("oldest", 1, minsAgo(90)),
        rider("mid", 1, minsAgo(30)),
      ],
      5,
      NOW,
    );
    expect(ranked.map((r) => r.id)).toEqual(["never", "oldest", "mid", "recent"]);
  });

  it("demotes over-cap riders below every under-cap rider", () => {
    // "full" is the most idle but sits at the cap → must not lead the queue.
    const ranked = rankDispatchRiders(
      [rider("full", 2, null), rider("busy", 1, minsAgo(1)), rider("free", 0, minsAgo(1000))],
      2,
      NOW,
    );
    expect(ranked.map((r) => r.id)).toEqual(["free", "busy", "full"]);
    expect(ranked.find((r) => r.id === "full")?.under_cap).toBe(false);
    expect(ranked.filter((r) => r.under_cap)).toHaveLength(2);
  });

  it("flags capacity using active_count vs the cap", () => {
    const ranked = rankDispatchRiders([rider("at", 3), rider("under", 2)], 3, NOW);
    expect(ranked.find((r) => r.id === "at")?.under_cap).toBe(false);
    expect(ranked.find((r) => r.id === "under")?.under_cap).toBe(true);
  });

  it("treats an invalid cap as the default cap", () => {
    const ranked = rankDispatchRiders([rider("a", DEFAULT_MAX_ACTIVE_DELIVERIES)], 0, NOW);
    expect(ranked[0].under_cap).toBe(false);
  });

  it("computes idle_ms from the injected clock, floored at 0", () => {
    const future = new Date(NOW.getTime() + 60_000); // clock skew guard
    const ranked = rankDispatchRiders([rider("a", 0, future.toISOString()), rider("b", 0, minsAgo(10))], 5, NOW);
    const a = ranked.find((r) => r.id === "a");
    const b = ranked.find((r) => r.id === "b");
    expect(a?.idle_ms).toBe(0);
    expect(b?.idle_ms).toBe(10 * 60_000);
    // idle 0 is shortest → "a" sorts last among equal-load riders
    expect(ranked.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("gives a deterministic order for fully tied riders", () => {
    const tied = [rider("z", 1, minsAgo(45)), rider("a", 1, minsAgo(45)), rider("m", 1, minsAgo(45))];
    const first = rankDispatchRiders(tied, 4, NOW).map((r) => r.id);
    const second = rankDispatchRiders([...tied].reverse(), 4, NOW).map((r) => r.id);
    expect(first).toEqual(second);
    expect(first).toEqual(["a", "m", "z"]);
  });

  it("does not mutate the input array", () => {
    const input = [rider("b", 1), rider("a", 0)];
    const before = input.map((r) => r.id);
    rankDispatchRiders(input, 2, NOW);
    expect(input.map((r) => r.id)).toEqual(before);
  });
});

describe("pickAutoAssignRider", () => {
  it("selects the fairest under-cap rider", () => {
    const pick = pickAutoAssignRider(
      [rider("a", 2, minsAgo(100)), rider("b", 1, minsAgo(5)), rider("c", 1, null)],
      3,
      NOW,
    );
    // b and c tie on load; c never delivered → longest idle → c wins.
    expect(pick?.id).toBe("c");
  });

  it("skips every over-cap rider", () => {
    const pick = pickAutoAssignRider([rider("full1", 3), rider("full2", 5)], 3, NOW);
    expect(pick).toBeNull();
  });

  it("returns null when there are no riders", () => {
    expect(pickAutoAssignRider([], 2, NOW)).toBeNull();
  });

  it("never picks an at-cap rider even if it is the only one", () => {
    expect(pickAutoAssignRider([rider("only", 2)], 2, NOW)).toBeNull();
  });

  it("prefers an idle rider over a busier one regardless of order", () => {
    const shuffled = [rider("loaded", 2, null), rider("idle", 0, minsAgo(60))];
    const pick = pickAutoAssignRider(shuffled, 4, NOW);
    expect(pick?.id).toBe("idle");
  });

  it("is order-independent for the same candidate set", () => {
    const set = [rider("a", 1, minsAgo(10)), rider("b", 0, minsAgo(5)), rider("c", 2, null)];
    const forward = pickAutoAssignRider(set, 3, NOW)?.id;
    const reversed = pickAutoAssignRider([...set].reverse(), 3, NOW)?.id;
    expect(forward).toBe(reversed);
    expect(forward).toBe("b");
  });
});

describe("normalizeMaxActiveDeliveries", () => {
  it("passes valid caps through", () => {
    expect(normalizeMaxActiveDeliveries(1)).toBe(1);
    expect(normalizeMaxActiveDeliveries(5)).toBe(5);
    expect(normalizeMaxActiveDeliveries("3")).toBe(3);
  });

  it("floors fractional input", () => {
    expect(normalizeMaxActiveDeliveries(2.9)).toBe(2);
  });

  it("falls back to the default for junk, zero and negatives", () => {
    expect(normalizeMaxActiveDeliveries(0)).toBe(DEFAULT_MAX_ACTIVE_DELIVERIES);
    expect(normalizeMaxActiveDeliveries(-4)).toBe(DEFAULT_MAX_ACTIVE_DELIVERIES);
    expect(normalizeMaxActiveDeliveries("abc")).toBe(DEFAULT_MAX_ACTIVE_DELIVERIES);
    expect(normalizeMaxActiveDeliveries(undefined)).toBe(DEFAULT_MAX_ACTIVE_DELIVERIES);
    expect(normalizeMaxActiveDeliveries(null)).toBe(DEFAULT_MAX_ACTIVE_DELIVERIES);
  });

  it("clamps absurdly large caps so fairness still applies", () => {
    expect(normalizeMaxActiveDeliveries(9999)).toBe(20);
  });
});
