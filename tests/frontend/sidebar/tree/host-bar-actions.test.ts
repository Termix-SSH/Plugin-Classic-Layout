import { describe, expect, it, vi } from "vitest";
import {
  canChangeBarActions,
  changeBarAction,
  hostToolsMode,
  opensInHostPage,
  setBarActionChanger,
  showsInBar,
} from "../../../../src/frontend/sidebar/tree/host-bar-actions";

describe("showsInBar", () => {
  it("follows the action's own default without a choice", () => {
    expect(showsInBar({}, { id: "terminal" })).toBe(true);
    expect(showsInBar({}, { id: "maintenance", tray: false })).toBe(false);
  });

  it("lets the user's choice win either way", () => {
    expect(
      showsInBar({ maintenance: true }, { id: "maintenance", tray: false }),
    ).toBe(true);
    expect(showsInBar({ "ai-agent": false }, { id: "ai-agent" })).toBe(false);
  });

  it("keeps tools on the row when there is a host page", () => {
    const docker = { id: "docker", kind: "open", tabType: "docker" };
    expect(showsInBar({}, docker)).toBe(true);
  });
});

describe("opensInHostPage", () => {
  it("takes plain tool tabs only", () => {
    expect(opensInHostPage({ kind: "open", tabType: "docker" })).toBe(true);
    expect(opensInHostPage({ kind: "open", tabType: "host" })).toBe(false);
    expect(opensInHostPage({ kind: "connect", tabType: "terminal" })).toBe(
      false,
    );
    expect(
      opensInHostPage({ kind: "open", tabType: "docker", run: () => {} }),
    ).toBe(false);
  });
});

describe("hostToolsMode", () => {
  it("defaults to own tabs", () => {
    expect(hostToolsMode(undefined)).toBe("tab");
    expect(hostToolsMode("weird")).toBe("tab");
    expect(hostToolsMode("page")).toBe("page");
    expect(hostToolsMode("only")).toBe("only");
  });
});

describe("changeBarAction", () => {
  it("goes through the hosts panel's saver", () => {
    const saver = vi.fn();
    expect(canChangeBarActions()).toBe(false);
    setBarActionChanger(saver);
    changeBarAction("docker", false);
    expect(saver).toHaveBeenCalledWith("docker", false);
    setBarActionChanger(null);
  });
});
