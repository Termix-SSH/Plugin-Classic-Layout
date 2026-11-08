import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  ServerStatusProvider,
  ShellControllerProvider,
  TabPortals,
  setPermissionsForTesting,
} from "@termix-ssh/plugin-sdk/testing-host";

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ClassicLayout } from "../../../src/frontend/layout/ClassicLayout";

// The shell keeps polling after unmount; its late logs would reach a closed worker.
for (const level of ["log", "info", "warn", "error", "debug"] as const) {
  console[level] = () => {};
}

beforeEach(() => setPermissionsForTesting([], true));
afterEach(cleanup);

describe("ClassicLayout", () => {
  it("draws the rail, the sidebar and the tab bar around the stage", async () => {
    render(
      <ServerStatusProvider isAuthenticated>
        <ShellControllerProvider username="admin" onLogout={() => {}}>
          <ClassicLayout />
          <TabPortals />
        </ShellControllerProvider>
      </ServerStatusProvider>,
    );
    await waitFor(() =>
      expect(screen.getAllByRole("button").length).toBeGreaterThan(3),
    );
    expect(document.body.textContent).toContain("nav.hosts");
  });

  // z-40 inline views and z-50 prompts must stay under the rail, and the rail
  // under dialogs on the body, so the shell row needs its own stacking context.
  it("keeps the rail above panels but inside the shell's stacking context", () => {
    const { container } = render(
      <ServerStatusProvider isAuthenticated>
        <ShellControllerProvider username="admin" onLogout={() => {}}>
          <ClassicLayout />
          <TabPortals />
        </ShellControllerProvider>
      </ServerStatusProvider>,
    );
    const rail = container.querySelector(".z-\\[60\\]");
    expect(rail).not.toBeNull();
    expect(rail?.closest(".isolate")).not.toBeNull();
  });
});
