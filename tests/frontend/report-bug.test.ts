import { afterEach, describe, expect, it, vi } from "vitest";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
import {
  canMakeReport,
  openBugReport,
  openDiagnosticsPage,
  resetReportOpener,
  setReportOpener,
} from "../../src/frontend/report-bug";

afterEach(() => {
  resetReportOpener();
  vi.restoreAllMocks();
});

describe("openBugReport", () => {
  it("opens the diagnostics report about Termix when core has it", () => {
    const openDiagnostics = vi.fn();
    setReportOpener({ openDiagnostics } as unknown as TermixApp);
    expect(canMakeReport()).toBe(true);
    openBugReport();
    expect(openDiagnostics).toHaveBeenCalledWith({ pluginId: null });
  });

  it("falls back to the GitHub form on older cores", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setReportOpener({} as TermixApp);
    expect(canMakeReport()).toBe(false);
    openBugReport();
    expect(String(open.mock.calls[0][0])).toContain(
      "github.com/Termix-SSH/Termix/issues/new",
    );
  });
});

describe("openDiagnosticsPage", () => {
  it("opens the diagnostics page when core has it", () => {
    const openDiagnostics = vi.fn();
    setReportOpener({ openDiagnostics } as unknown as TermixApp);
    openDiagnosticsPage();
    expect(openDiagnostics).toHaveBeenCalledWith({ pluginId: null });
  });

  it("does nothing on older cores", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setReportOpener({} as TermixApp);
    openDiagnosticsPage();
    expect(open).not.toHaveBeenCalled();
  });
});
