import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const save = vi.hoisted(() => vi.fn(async (next: unknown) => next));

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getRoles: async () => ({
    roles: [{ name: "operator", displayName: "Operator" }],
  }),
  roleLabel: (_t: unknown, name: string) => name,
  useRailItems: () => [
    { id: "hosts", labelKey: "nav.hosts" },
    {
      id: "snippets",
      labelKey: "Snippets",
      pluginId: "snippets",
      simplePreset: true,
    },
    { id: "docker", labelKey: "Docker", pluginId: "docker" },
  ],
}));
vi.mock("../../../src/frontend/interface-defaults", () => ({
  useInterfaceDefaults: () => ({
    defaults: { everyone: null, roles: {} },
    loaded: true,
    save,
  }),
}));

import { InterfaceDefaultsSettings } from "../../../src/frontend/settings/InterfaceDefaultsSettings";

afterEach(() => {
  cleanup();
  save.mockClear();
});

describe("InterfaceDefaultsSettings", () => {
  it("starts from the apps people get without defaults and saves a change", async () => {
    render(<InterfaceDefaultsSettings />);
    const snippets = screen.getByRole("checkbox", { name: "Snippets" });
    expect(snippets.getAttribute("aria-checked")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "common.save" })
        .hasAttribute("disabled"),
    ).toBe(true);

    await userEvent.click(screen.getByRole("checkbox", { name: "Docker" }));
    await userEvent.click(screen.getByRole("button", { name: "common.save" }));
    expect(save).toHaveBeenCalledWith({
      everyone: {
        preset: "balanced",
        pins: ["snippets", "docker"],
        locked: false,
      },
      roles: {},
    });
  });

  it("gives a role its own defaults, starting from everyone's", async () => {
    render(<InterfaceDefaultsSettings />);
    await userEvent.click(
      await screen.findByRole("radio", { name: "Operator" }),
    );
    expect(
      screen.getByText("settings.interfaceDefaults.inherits"),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("radio", {
        name: "settings.interfaceDefaults.advanced",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const saved = save.mock.calls[0][0] as {
      everyone: unknown;
      roles: Record<string, { preset: string }>;
    };
    expect(saved.everyone).toBeNull();
    expect(saved.roles.operator.preset).toBe("advanced");
  });
});
