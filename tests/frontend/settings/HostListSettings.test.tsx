import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  defaultCredentialSidebarPreferences,
  defaultHostSidebarPreferences,
} from "@termix-ssh/plugin-sdk/ui";

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
  usePluginUiPreferences: () => ({ values: {}, set: vi.fn() }),
}));

const setOverride = vi.fn();
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUiPreference: (area: string, key: string) =>
    area === "hostEditor" && key === "mode" ? "simple" : undefined,
  useUiPreferencesContext: () => ({ setOverride }),
}));

const hostUpdate = vi.fn();
const credentialUpdate = vi.fn();
vi.mock(
  "../../../src/frontend/sidebar/tree/hooks/useHostSidebarPreferences",
  () => ({
    useHostSidebarPreferences: () => ({
      preferences: defaultHostSidebarPreferences(),
      update: hostUpdate,
    }),
  }),
);
vi.mock(
  "../../../src/frontend/sidebar/credential-tree/hooks/useCredentialSidebarPreferences",
  () => ({
    useCredentialSidebarPreferences: () => ({
      preferences: defaultCredentialSidebarPreferences(),
      update: credentialUpdate,
    }),
  }),
);

import { HostListSettings } from "../../../src/frontend/settings/HostListSettings";
import { CredentialListSettings } from "../../../src/frontend/settings/CredentialListSettings";

afterEach(() => {
  cleanup();
  hostUpdate.mockClear();
  credentialUpdate.mockClear();
});

function applied(update: ReturnType<typeof vi.fn>, prev: unknown) {
  const patch = update.mock.calls[0][0];
  return typeof patch === "function" ? patch(prev) : patch;
}

describe("HostListSettings", () => {
  it("saves a toggle to the host list preferences", () => {
    render(<HostListSettings />);
    const prev = defaultHostSidebarPreferences();
    fireEvent.click(screen.getByRole("switch", { name: "hosts.stripedRows" }));
    expect(hostUpdate).toHaveBeenCalledTimes(1);
    const next = applied(hostUpdate, prev);
    expect(next.display.stripedRows).toBe(!prev.display.stripedRows);
  });
});

describe("Add host form setting", () => {
  it("saves the form the add host editor opens with", () => {
    render(<HostListSettings />);
    const select = screen.getByDisplayValue("settings.hostForm.simple");
    fireEvent.change(select, { target: { value: "full" } });
    expect(setOverride).toHaveBeenCalledWith("hostEditor", "mode", "full");
  });
});

describe("CredentialListSettings", () => {
  it("saves a toggle to the credential list preferences", () => {
    render(<CredentialListSettings />);
    const prev = defaultCredentialSidebarPreferences();
    fireEvent.click(
      screen.getByRole("switch", { name: "credentials.showCredentialTags" }),
    );
    const next = applied(credentialUpdate, prev);
    expect(next.display.showTags).toBe(!prev.display.showTags);
  });
});
