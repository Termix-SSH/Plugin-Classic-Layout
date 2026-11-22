import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const meta = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock("@termix-ssh/plugin-sdk/ui", () => ({
  useServerStatusMeta: () => meta.value,
}));

const { useStatusChecksOff } =
  await import("../../src/frontend/status-checks-off");

describe("useStatusChecksOff", () => {
  it("follows Termix when it says nothing checks hosts", () => {
    meta.value = { initialLoadComplete: true, statusChecksOff: true };
    expect(renderHook(() => useStatusChecksOff()).result.current).toBe(true);
  });

  it("stays off on a Termix that doesn't say", () => {
    meta.value = { initialLoadComplete: true };
    expect(renderHook(() => useStatusChecksOff()).result.current).toBe(false);
  });
});
