import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { InterfaceTemplate } from "../../src/frontend/interface-defaults";

const state = vi.hoisted(() => ({
  template: null as InterfaceTemplate | null,
  preset: "balanced",
  onboarding: { completedAt: null as string | null, skipped: false },
  railPinsSet: false,
  setPreset: vi.fn(),
  applyPresetSideEffects: vi.fn(async () => {}),
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  applyPresetSideEffects: state.applyPresetSideEffects,
  useUiPreferencesContext: () => ({
    loaded: true,
    preferences: { preset: state.preset, onboarding: state.onboarding },
    setPreset: state.setPreset,
  }),
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePluginUiPreferences: () => ({
    values: { railPinsSet: state.railPinsSet },
    set: vi.fn(),
  }),
}));
vi.mock("../../src/frontend/interface-defaults", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useInterfaceDefaults: () => ({ template: state.template, loaded: true }),
}));

import { InterfaceDefaultsSync } from "../../src/frontend/InterfaceDefaultsSync";

afterEach(() => {
  cleanup();
  state.template = null;
  state.preset = "balanced";
  state.onboarding = { completedAt: null, skipped: false };
  state.railPinsSet = false;
  state.setPreset.mockReset();
  state.applyPresetSideEffects.mockClear();
});

describe("InterfaceDefaultsSync", () => {
  it("does nothing without a template", () => {
    render(<InterfaceDefaultsSync />);
    expect(state.setPreset).not.toHaveBeenCalled();
  });

  it("starts a new user on the admin's look", () => {
    state.template = { preset: "simple", pins: [], locked: false };
    render(<InterfaceDefaultsSync />);
    expect(state.setPreset).toHaveBeenCalledWith("simple");
    expect(state.applyPresetSideEffects).toHaveBeenCalledWith("simple");
  });

  it("leaves someone who already set up their view alone", () => {
    state.template = { preset: "simple", pins: [], locked: false };
    state.onboarding = { completedAt: "2026-11-01", skipped: false };
    render(<InterfaceDefaultsSync />);
    expect(state.setPreset).not.toHaveBeenCalled();
  });

  it("always applies a locked look", () => {
    state.template = { preset: "advanced", pins: [], locked: true };
    state.onboarding = { completedAt: "2026-11-01", skipped: false };
    render(<InterfaceDefaultsSync />);
    expect(state.setPreset).toHaveBeenCalledWith("advanced");
  });

  it("does not touch a locked look that already matches", () => {
    state.template = { preset: "balanced", pins: [], locked: true };
    render(<InterfaceDefaultsSync />);
    expect(state.setPreset).not.toHaveBeenCalled();
  });
});
