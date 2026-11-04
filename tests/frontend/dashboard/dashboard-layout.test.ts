import { describe, expect, it } from "vitest";
import {
  autoSlots,
  decodeSlots,
  encodeSlots,
  sameLayout,
  type StoredSlot,
} from "../../../src/frontend/dashboard/dashboard-layout";

const base: StoredSlot[] = [
  { key: "stats_0", id: "stats_bar", panel: "main", order: 0, height: 76 },
  {
    key: "quick_0",
    id: "quick_actions",
    panel: "side",
    order: 0,
    height: null,
  },
];

describe("dashboard layout", () => {
  it("round trips through preference strings", () => {
    expect(decodeSlots(encodeSlots(base))).toEqual(base);
  });

  it("refuses broken saved layouts", () => {
    expect(decodeSlots(null)).toBeNull();
    expect(decodeSlots([])).toBeNull();
    expect(decodeSlots(["a|b|middle|0|"])).toBeNull();
    expect(decodeSlots([42])).toBeNull();
  });

  it("puts Needs attention first when a plugin offers it", () => {
    const slots = autoSlots(base, ["attention", "docker-hosts"]);
    expect(slots[0]).toMatchObject({
      id: "attention",
      panel: "main",
      order: 0,
    });
    expect(slots.find((s) => s.id === "stats_bar")?.order).toBe(1);
    expect(slots.find((s) => s.id === "quick_actions")?.order).toBe(0);
  });

  it("leaves the layout alone without it", () => {
    expect(autoSlots(base, ["docker-hosts"])).toBe(base);
  });

  it("compares layouts by what is saved", () => {
    expect(sameLayout(base, [...base.map((s) => ({ ...s }))])).toBe(true);
    expect(sameLayout(base, autoSlots(base, ["attention"]))).toBe(false);
  });
});
