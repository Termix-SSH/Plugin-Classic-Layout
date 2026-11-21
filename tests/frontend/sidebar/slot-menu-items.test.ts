import { describe, expect, it } from "vitest";
import { slotMenuItems } from "../../../src/frontend/sidebar/slot-menu-items";

describe("slotMenuItems", () => {
  it("keeps plain items and leaves components and data to their slots", () => {
    const items = slotMenuItems([
      { actionId: "a", titleKey: "a" },
      { actionId: "b", titleKey: "b", kind: "button" },
      { actionId: "c", titleKey: "c", kind: "component" },
      { actionId: "d", titleKey: "d", kind: "data" },
    ] as never);
    expect(items.map((item) => item.actionId)).toEqual(["a", "b"]);
  });
});
