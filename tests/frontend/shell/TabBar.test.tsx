import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { Tab } from "@termix-ssh/plugin-sdk/ui";
import type { SplitSummary } from "@termix-ssh/plugin-sdk/ui";

vi.mock("react-i18next", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) =>
          opts ? `${key}:${JSON.stringify(opts)}` : key,
      }),
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
      useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) =>
          opts ? `${key}:${JSON.stringify(opts)}` : key,
      }),
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

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      isElectron: () => true,
      // Terminal tabs count as live sessions, so they get a refresh button.
      isSessionTabType: (type: string) => type === "terminal",
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

import { TabBar } from "../../../src/frontend/shell/TabBar";

afterEach(cleanup);

const tabs = [
  { id: "dashboard", type: "dashboard", label: "Dashboard" },
  { id: "terminal-1", type: "terminal", label: "web-01" },
] as Tab[];

function props(
  overrides: Partial<ComponentProps<typeof TabBar>> = {},
): ComponentProps<typeof TabBar> {
  return {
    tabs,
    activeTabId: "dashboard",
    splits: [],
    activeSplitFull: false,
    onSetActiveTab: () => {},
    onCloseTab: () => {},
    onRefreshTab: () => {},
    onReorderTabs: () => {},
    onSplitAction: () => {},
    isAppFullscreen: false,
    onToggleAppFullscreen: () => {},
    ...overrides,
  };
}

describe("TabBar workspace continuity", () => {
  it("keeps one shared indicator on the active workspace", () => {
    const { container, rerender } = render(<TabBar {...props()} />);
    expect(
      container.querySelector('[data-tab-indicator="dashboard"]'),
    ).toBeTruthy();

    rerender(<TabBar {...props({ activeTabId: "terminal-1" })} />);

    expect(container.querySelectorAll("[data-tab-indicator]")).toHaveLength(1);
    expect(
      container.querySelector('[data-tab-indicator="terminal-1"]'),
    ).toBeTruthy();
  });

  it("activates a workspace immediately when its tab is clicked", () => {
    const onSetActiveTab = vi.fn();
    const { getByText } = render(<TabBar {...props({ onSetActiveTab })} />);

    fireEvent.click(getByText("web-01"));

    expect(onSetActiveTab).toHaveBeenCalledWith("terminal-1");
  });
});

describe("TabBar long tab titles", () => {
  const longName = "rhiz3k-HP-ProDesk-600-G6-Desktop-Mini-PC";
  const longTabs = [
    ...tabs,
    { id: "terminal-2", type: "terminal", label: longName },
  ] as Tab[];

  it("truncates a long hostname and keeps the full name as a tooltip", () => {
    const { getByText } = render(<TabBar {...props({ tabs: longTabs })} />);
    const title = getByText(longName);

    expect(title).toBeTruthy();
    expect(title.classList.contains("truncate")).toBe(true);
    expect(title.classList.contains("min-w-0")).toBe(true);
    expect(title.getAttribute("title")).toBe(longName);
  });

  it("caps the tab width on mobile only", () => {
    const { getByText } = render(<TabBar {...props({ tabs: longTabs })} />);
    const tabRoot = getByText(longName).parentElement as HTMLElement;
    const classes = Array.from(tabRoot.classList);

    expect(
      classes.some((c) => c.startsWith("max-w-") && c !== "max-w-none"),
    ).toBe(true);
    expect(classes).toContain("md:max-w-none");
  });

  it("keeps the refresh and close buttons on a long connection tab", () => {
    const { getByText } = render(
      <TabBar {...props({ tabs: longTabs, activeTabId: "terminal-2" })} />,
    );
    const tabRoot = getByText(longName).parentElement as HTMLElement;

    expect(within(tabRoot).getByLabelText("nav.refreshTab")).toBeTruthy();
    expect(within(tabRoot).getByLabelText("nav.close")).toBeTruthy();
  });

  it("still shows a short name in full", () => {
    const { getByText } = render(<TabBar {...props({ tabs: longTabs })} />);
    const title = getByText("web-01");

    expect(title).toBeTruthy();
    expect(title.getAttribute("title")).toBe("web-01");
  });
});

describe("TabBar split menu", () => {
  const split: SplitSummary = {
    id: "split-1",
    label: "Split 1",
    full: false,
    panes: [
      { id: "p1", index: 1, tabId: "terminal-9", label: "db-01" },
      { id: "p2", index: 2, tabId: null, label: null },
    ],
  };

  function openMenu(overrides: Partial<ComponentProps<typeof TabBar>> = {}) {
    const onSplitAction = vi.fn();
    const view = render(<TabBar {...props({ onSplitAction, ...overrides })} />);
    fireEvent.contextMenu(view.getByText("web-01"));
    return { ...view, onSplitAction };
  }

  it("splits the clicked tab right or down", () => {
    const { getByText, onSplitAction } = openMenu();
    fireEvent.click(getByText("splitScreen.splitDown"));
    expect(onSplitAction).toHaveBeenCalledWith({
      kind: "split",
      tabId: "terminal-1",
      edge: "bottom",
    });
  });

  it("lists every pane of every split, so the target is always clear", () => {
    const { getByText, onSplitAction } = openMenu({ splits: [split] });

    expect(
      getByText('splitScreen.addToSplit:{"split":"Split 1"}'),
    ).toBeTruthy();
    expect(
      getByText('splitScreen.paneItem:{"index":1,"label":"db-01"}'),
    ).toBeTruthy();
    fireEvent.click(getByText('splitScreen.paneEmptyItem:{"index":2}'));

    expect(onSplitAction).toHaveBeenCalledWith({
      kind: "addToPane",
      tabId: "terminal-1",
      splitTabId: "split-1",
      paneId: "p2",
    });
  });

  it("adds a new pane to an existing split", () => {
    const { getByText, onSplitAction } = openMenu({ splits: [split] });
    fireEvent.click(getByText("splitScreen.newPaneBelow"));
    expect(onSplitAction).toHaveBeenCalledWith({
      kind: "addPane",
      tabId: "terminal-1",
      splitTabId: "split-1",
      edge: "bottom",
    });
  });

  it("disables new panes on a full split", () => {
    const { getByText } = openMenu({ splits: [{ ...split, full: true }] });
    expect(
      (
        getByText("splitScreen.newPaneRight").closest(
          "button",
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("offers unsplit on a split tab instead of splitting it", () => {
    const splitTab = {
      id: "split-1",
      type: "split-screen",
      label: "Split 1",
      split: {
        root: { kind: "pane", id: "p1", tabId: null },
        focusedPaneId: "p1",
      },
    } as Tab;
    const onSplitAction = vi.fn();
    const { getByText, queryByText } = render(
      <TabBar {...props({ tabs: [...tabs, splitTab], onSplitAction })} />,
    );
    fireEvent.contextMenu(getByText("Split 1"));

    expect(queryByText("splitScreen.splitRight")).toBeNull();
    fireEvent.click(getByText("splitScreen.unsplit"));
    expect(onSplitAction).toHaveBeenCalledWith({
      kind: "unsplit",
      splitTabId: "split-1",
    });
  });
});

describe("bulk reconnect menu", () => {
  it("offers the workspace action from a non-session tab and closes the menu", () => {
    const onReconnectDisconnected = vi.fn();
    const filesTab = {
      id: "files",
      type: "file_manager",
      label: "Files",
    } as Tab;
    const view = render(
      <TabBar
        {...props({ tabs: [...tabs, filesTab], onReconnectDisconnected })}
      />,
    );
    fireEvent.contextMenu(view.getByText("Files"));
    fireEvent.click(view.getByText("nav.reconnectDisconnectedTerminals"));
    expect(onReconnectDisconnected).toHaveBeenCalledOnce();
    expect(view.queryByText("nav.reconnectDisconnectedTerminals")).toBeNull();
  });
});
