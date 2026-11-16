import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { InterfaceTemplate } from "../../src/frontend/interface-defaults";

const state = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
  set: vi.fn(),
  template: null as InterfaceTemplate | null,
}));

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePluginUiPreferences: () => ({ values: state.values, set: state.set }),
}));
vi.mock("../../src/frontend/interface-defaults", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useInterfaceDefaults: () => ({ template: state.template }),
}));

import { useRailPins } from "../../src/frontend/rail-pins";
import { templateFor } from "../../src/frontend/interface-defaults";

const core = { id: "hosts" };
const snippets = { id: "snippets", pluginId: "snippets", simplePreset: true };
const docker = { id: "docker", pluginId: "docker" };
const items = [core, snippets, docker];

afterEach(() => {
  state.values = {};
  state.set.mockReset();
  state.template = null;
});

describe("useRailPins", () => {
  it("keeps core items and Simple apps on the rail by default", () => {
    state.values = { railAppsMenu: true };
    const { result } = renderHook(() => useRailPins());
    expect(result.current.isPinned(core)).toBe(true);
    expect(result.current.isPinned(snippets)).toBe(true);
    expect(result.current.isPinned(docker)).toBe(false);
  });

  it("puts every app on the rail when the apps menu is off", () => {
    state.values = { railAppsMenu: false };
    const { result } = renderHook(() => useRailPins());
    expect(result.current.isPinned(docker)).toBe(true);
  });

  it("follows the admin's pins until the user picks their own", () => {
    state.values = { railAppsMenu: true };
    state.template = { preset: "balanced", pins: ["docker"], locked: false };
    const first = renderHook(() => useRailPins()).result.current;
    expect(first.isPinned(docker)).toBe(true);
    expect(first.isPinned(snippets)).toBe(false);

    state.values = { railAppsMenu: true, railPinsSet: true, railPins: [] };
    const own = renderHook(() => useRailPins()).result.current;
    expect(own.isPinned(docker)).toBe(false);
  });

  it("saves the whole pin list when toggling", () => {
    state.values = { railAppsMenu: true };
    const { result } = renderHook(() => useRailPins());
    result.current.toggle(docker, items);
    expect(state.set).toHaveBeenCalledWith("railPins", ["snippets", "docker"]);
    expect(state.set).toHaveBeenCalledWith("railPinsSet", true);
  });

  it("ignores the user's pins and refuses changes when locked", () => {
    state.values = { railAppsMenu: false, railPinsSet: true, railPins: [] };
    state.template = { preset: "simple", pins: ["docker"], locked: true };
    const { result } = renderHook(() => useRailPins());
    expect(result.current.locked).toBe(true);
    expect(result.current.appsMenu).toBe(true);
    expect(result.current.isPinned(docker)).toBe(true);
    expect(result.current.isPinned(snippets)).toBe(false);
    result.current.toggle(snippets, items);
    expect(state.set).not.toHaveBeenCalled();
  });
});

describe("templateFor", () => {
  const simple: InterfaceTemplate = {
    preset: "simple",
    pins: [],
    locked: false,
  };
  const advanced: InterfaceTemplate = {
    preset: "advanced",
    pins: [],
    locked: true,
  };

  it("uses the first of the user's roles that has a template", () => {
    const defaults = { everyone: simple, roles: { operator: advanced } };
    expect(templateFor(defaults, ["viewer", "operator"])).toBe(advanced);
  });

  it("falls back to everyone, then to nothing", () => {
    expect(templateFor({ everyone: simple, roles: {} }, ["viewer"])).toBe(
      simple,
    );
    expect(templateFor({ everyone: null, roles: {} }, [])).toBeNull();
    expect(templateFor(null, [])).toBeNull();
  });
});
