import { describe, expect, it } from "vitest";
import {
  autoSlots,
  decodeGrid,
  decodeSlots,
  defaultGrid,
  encodeGrid,
  encodeSlots,
  gridFromColumns,
  sameGrid,
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

describe("dashboard grid", () => {
  const cards = [
    { key: "a_0", id: "stats_bar", x: 0, y: 0, w: 8, h: 76 },
    {
      key: "ops_1",
      id: "ops-signal",
      x: 8,
      y: 0,
      w: 4,
      h: null,
      title: "Disk | space",
      config: { signal: "host-metrics.health", hostId: 3 },
    },
  ];

  it("round trips cards with titles and settings", () => {
    expect(decodeGrid(encodeGrid(cards))).toEqual(cards);
  });

  it("refuses broken lines and drops a broken config", () => {
    expect(decodeGrid(null)).toBeNull();
    expect(decodeGrid(["a|b|x|0|4|"])).toBeNull();
    expect(decodeGrid([7])).toBeNull();
    expect(decodeGrid(["a|b|0|0|4||Title|%7Bbad"])).toEqual([
      { key: "a", id: "b", x: 0, y: 0, w: 4, h: null, title: "Title" },
    ]);
  });

  it("moves the old columns onto the grid in order", () => {
    const grid = gridFromColumns([
      ...base,
      {
        key: "host_0",
        id: "host_status",
        panel: "main",
        order: 1,
        height: null,
      },
    ]);
    expect(grid).toEqual([
      { key: "stats_0", id: "stats_bar", x: 0, y: 0, w: 8, h: 76 },
      { key: "host_0", id: "host_status", x: 0, y: 76, w: 8, h: 360 },
      { key: "quick_0", id: "quick_actions", x: 8, y: 0, w: 4, h: 360 },
    ]);
    expect(sameGrid(grid, [...grid])).toBe(true);
  });
});

describe("default dashboard grid", () => {
  const bottoms = (grid: ReturnType<typeof defaultGrid>) => {
    const left = Math.max(
      ...grid.filter((c) => c.x === 0).map((c) => c.y + (c.h ?? 0)),
    );
    const right = Math.max(
      ...grid.filter((c) => c.x + c.w === 12).map((c) => c.y + (c.h ?? 0)),
    );
    return { left, right };
  };

  it("puts the strips across the top and ends both sides on one line", () => {
    const grid = defaultGrid([]);
    expect(grid.slice(0, 2).map((c) => [c.id, c.w])).toEqual([
      ["stats_bar", 12],
      ["counters_bar", 12],
    ]);
    const { left, right } = bottoms(grid);
    expect(left).toBe(right);
  });

  it("gives Needs attention a row with Quick actions beside it", () => {
    const grid = defaultGrid(["attention", "other"]);
    const attention = grid.find((c) => c.id === "attention")!;
    const quick = grid.find((c) => c.id === "quick_actions")!;
    expect(attention).toMatchObject({ x: 0, w: 8 });
    expect(quick).toMatchObject({ x: 8, w: 4, y: attention.y, h: attention.h });
    expect(grid.some((c) => c.id === "other")).toBe(false);
    const { left, right } = bottoms(grid);
    expect(left).toBe(right);
  });

  it("keeps every card inside the 12 columns", () => {
    for (const grid of [defaultGrid([]), defaultGrid(["attention"])])
      for (const card of grid) expect(card.x + card.w).toBeLessThanOrEqual(12);
  });
});

describe("default dashboard grid in a view", () => {
  const end = (grid: ReturnType<typeof defaultGrid>) =>
    Math.max(...grid.map((card) => card.y + (card.h ?? 0)));

  it("grows the last row so the dashboard reaches the bottom of the view", () => {
    expect(end(defaultGrid([], 1200))).toBe(1200);
    expect(end(defaultGrid(["attention"], 1300))).toBe(1300);
  });

  it("keeps its usual heights in a short view", () => {
    expect(end(defaultGrid([], 300))).toBe(end(defaultGrid([])));
  });

  it("still ends both sides on one line when it grows", () => {
    const grid = defaultGrid([], 1100);
    const left = Math.max(
      ...grid.filter((c) => c.x === 0).map((c) => c.y + (c.h ?? 0)),
    );
    const right = Math.max(
      ...grid.filter((c) => c.x + c.w === 12).map((c) => c.y + (c.h ?? 0)),
    );
    expect(left).toBe(right);
  });
});
