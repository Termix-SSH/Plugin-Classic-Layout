import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Host } from "@termix-ssh/plugin-sdk/ui";

const mocks = vi.hoisted(() => ({ activity: vi.fn() }));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (original) => ({
  ...(await original<object>()),
  getRecentActivity: mocks.activity,
  activityTarget: () => ({ tab: "terminal" }),
}));
import { CommandPalette } from "../../../src/frontend/shell/CommandPalette";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("recent activity host identity", () => {
  it.each(["renamed", "duplicate", "removed"])(
    "opens by id when the host is %s",
    async (scenario) => {
      const other = {
        id: "2",
        name: "old-name",
        ip: "192.0.2.2",
        username: "test",
      } as Host;
      const target = {
        ...other,
        id: "1",
        name: scenario === "renamed" ? "new-name" : "old-name",
      };
      const hosts = scenario === "removed" ? [other] : [other, target];
      mocks.activity.mockResolvedValue([
        {
          id: 10,
          hostId: 1,
          hostName: "old-name",
          type: "terminal",
          timestamp: new Date().toISOString(),
        },
      ]);
      const openByName = vi.fn();
      render(
        <CommandPalette
          isOpen
          setIsOpen={vi.fn()}
          hosts={hosts}
          onOpenTab={openByName}
        />,
      );
      const row = await screen.findByText("old-name", {
        selector: "[data-value='recent-activity-10'] span.truncate",
      });
      fireEvent.click(row);
      if (scenario === "removed") expect(openByName).not.toHaveBeenCalled();
      else
        expect(openByName).toHaveBeenCalledWith(
          "terminal",
          undefined,
          undefined,
          target,
        );
    },
  );
});
