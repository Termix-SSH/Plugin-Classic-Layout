import { describe, expect, it } from "vitest";
import { showsInBar } from "../../../../src/frontend/sidebar/tree/host-bar-actions";

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

  it("moves tools to the host page when there is one", () => {
    const docker = { id: "docker", kind: "open", tabType: "docker" };
    const page = { id: "host-page", kind: "open", tabType: "host" };
    const terminal = { id: "terminal", kind: "connect", tabType: "terminal" };
    expect(showsInBar({}, docker, true)).toBe(false);
    expect(showsInBar({}, page, true)).toBe(true);
    expect(showsInBar({}, terminal, true)).toBe(true);
    expect(showsInBar({}, docker, false)).toBe(true);
    expect(showsInBar({ docker: true }, docker, true)).toBe(true);
  });
});
