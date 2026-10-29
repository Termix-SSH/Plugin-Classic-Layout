import { describe, expect, it } from "vitest";
import { stripedRows } from "../../../src/frontend/sidebar/striped-rows";

describe("stripedRows", () => {
  it("stays on unless turned off", () => {
    expect(stripedRows({})).toBe(true);
    expect(stripedRows({ stripedRows: true })).toBe(true);
    expect(stripedRows({ stripedRows: false })).toBe(false);
  });
});
