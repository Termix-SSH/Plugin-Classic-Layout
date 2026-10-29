import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      useTranslation: () => ({ t: (key: string) => key }),
    }),
  ];
  for (const factory of factories) {
    Object.assign(
      merged,
      await factory((async () => ({ ...merged })) as never),
    );
  }
  return merged;
});
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      useTranslation: () => ({ t: (key: string) => key }),
    }),
  ];
  for (const factory of factories) {
    Object.assign(
      merged,
      await factory((async () => ({ ...merged })) as never),
    );
  }
  return merged;
});

import { HostStatusCard } from "../../../src/frontend/dashboard/DashboardTab";
import type { Host } from "@termix-ssh/plugin-sdk/ui";
import {
  registerHostAction,
  registerSlotContribution,
  resetActionRegistry,
  resetHostContributions,
  setPermissionsForTesting,
} from "@termix-ssh/plugin-sdk/testing-host";
import type React from "react";

afterEach(cleanup);

describe("HostStatusCard", () => {
  it("truncates long host identity without shrinking the metrics", () => {
    const host = {
      id: "host-1",
      name: "a-very-long-host-name-that-must-not-shift-the-status-columns",
      ip: "a-very-long-hostname.example.internal",
      online: false,
    } as Host;

    render(<HostStatusCard hosts={[host]} onOpenTab={() => {}} />);

    const name = screen.getByText(host.name);
    const ip = screen.getByText(host.ip);
    const row = name.closest("[role=button]");
    const badge = screen.getByText("hosts.status.offline");

    expect(name.className).toContain("truncate");
    expect(name.getAttribute("title")).toBe(host.name);
    expect(ip.className).toContain("truncate");
    expect(ip.getAttribute("title")).toBe(host.ip);
    expect(row?.firstElementChild?.nextElementSibling?.className).toContain(
      "min-w-0",
    );
    expect(badge.className).toContain("shrink-0");
  });
});

describe("dashboard host routing", () => {
  const Icon = (() => null) as never;
  beforeEach(() => {
    registerHostAction({
      id: "desk-connect",
      titleKey: "x",
      icon: Icon,
      kind: "connect",
      priority: 50,
      tabType: "desk",
      when: (host) => (host as Record<string, unknown>).enableDesk === true,
    });
    registerHostAction({
      id: "shell-connect",
      titleKey: "x",
      icon: Icon,
      kind: "connect",
      priority: 100,
      tabType: "shell",
      when: (host) => (host as Record<string, unknown>).enableShell === true,
    });
    registerHostAction({
      id: "stats",
      titleKey: "x",
      icon: Icon,
      kind: "open",
      overview: true,
      tabType: "stats",
      when: (host) => (host as Record<string, unknown>).enableShell === true,
    });
  });
  afterEach(resetHostContributions);

  it.each([
    [{ enableDesk: true }, "desk"],
    [{ enableShell: true, enableDesk: true }, "stats"],
  ] as const)("opens the right view for %j", (flags, expected) => {
    const host = {
      id: "1",
      name: "Remote host",
      ip: "192.0.2.1",
      ...flags,
    } as unknown as Host;
    const onOpenTab = vi.fn();
    render(<HostStatusCard hosts={[host]} onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByText("Remote host"));
    expect(onOpenTab).toHaveBeenCalledWith(host, expected);
  });
});

describe("host row badge slot", () => {
  beforeEach(() => setPermissionsForTesting([]));
  afterEach(() => resetActionRegistry());

  it("lets a plugin replace the status badge and falls back to ours", () => {
    registerSlotContribution("dashboard.hostRowBadge", {
      actionId: "health-badge",
      titleKey: "x",
      kind: "component",
      component: (props) =>
        props.host && (props.host as Host).name === "bad" ? (
          <span>failing {String(props.online)}</span>
        ) : (
          <>{props.fallback as React.ReactNode}</>
        ),
    });
    const hosts = [
      { id: "1", name: "bad", ip: "192.0.2.1", status: "online" },
      { id: "2", name: "good", ip: "192.0.2.2", status: "online" },
    ] as unknown as Host[];
    render(<HostStatusCard hosts={hosts} onOpenTab={() => {}} />);
    expect(screen.getByText("failing true")).toBeTruthy();
    expect(screen.getAllByText("hosts.status.online")).toHaveLength(1);
  });

  it("keeps the checking badge while status loads", () => {
    registerSlotContribution("dashboard.hostRowBadge", {
      actionId: "health-badge",
      titleKey: "x",
      kind: "component",
      component: () => <span>replaced</span>,
    });
    const host = { id: "1", name: "a", ip: "192.0.2.1" } as Host;
    render(
      <HostStatusCard hosts={[host]} onOpenTab={() => {}} statusLoading />,
    );
    expect(screen.queryByText("replaced")).toBeNull();
    expect(screen.getByText("dashboardTab.checking")).toBeTruthy();
  });
});
