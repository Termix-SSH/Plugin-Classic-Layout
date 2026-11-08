import { describe, expect, it, vi } from "vitest";
import {
  canChangeHostRows,
  changeHostRow,
  hostToolsMode,
  opensInHostPage,
  parseHostRows,
  setHostRowSaver,
  setHostRows,
  showsInBar,
  withHostRow,
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

  it("lets one host's choice beat the default", () => {
    expect(
      showsInBar({ docker: true }, { id: "docker" }, { docker: false }),
    ).toBe(false);
    expect(
      showsInBar({}, { id: "maintenance", tray: false }, { maintenance: true }),
    ).toBe(true);
    expect(showsInBar({ docker: false }, { id: "docker" }, {})).toBe(false);
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

describe("parseHostRows", () => {
  it("keeps valid choices and drops the rest", () => {
    expect(
      parseHostRows({
        "1": { click: "docker", bar: { docker: false, bad: "x" } },
        "2": { click: "" },
        "3": "nope",
      }),
    ).toEqual({ "1": { click: "docker", bar: { docker: false } } });
    expect(parseHostRows(null)).toEqual({});
    expect(parseHostRows([1])).toEqual({});
  });
});

describe("withHostRow", () => {
  it("sets and clears one host", () => {
    const one = withHostRow({}, "1", { click: "docker" });
    expect(one).toEqual({ "1": { click: "docker" } });
    const two = withHostRow(one, "1", { bar: { files: false } });
    expect(two["1"]).toEqual({ click: "docker", bar: { files: false } });
    expect(withHostRow(two, "1", { click: undefined, bar: undefined })).toEqual(
      {},
    );
  });
});

describe("changeHostRow", () => {
  it("saves every host's choices through the hosts panel", () => {
    const saver = vi.fn();
    setHostRows({ "2": { click: "files" } });
    expect(canChangeHostRows()).toBe(false);
    setHostRowSaver(saver);
    changeHostRow("1", { click: "docker" });
    expect(saver).toHaveBeenCalledWith({
      "1": { click: "docker" },
      "2": { click: "files" },
    });
    setHostRowSaver(null);
    setHostRows({});
  });
});
