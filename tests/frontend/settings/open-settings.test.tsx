import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const openSingleton = vi.fn();
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useShellController: () => ({ tabs: { openSingleton } }),
}));

import { useOpenSettingsPage } from "../../../src/frontend/settings/open-settings";

describe("useOpenSettingsPage", () => {
  it("opens the Settings tab on the asked page", () => {
    const { result } = renderHook(() => useOpenSettingsPage());
    result.current("host-list");
    expect(openSingleton).toHaveBeenCalledWith(
      "settings",
      undefined,
      undefined,
      { section: "host-list" },
    );
  });
});
