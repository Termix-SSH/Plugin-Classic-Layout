import { registerHostProtocol } from "@termix-ssh/plugin-sdk/testing-host";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Host } from "@termix-ssh/plugin-sdk/ui";
import { registerHostAction } from "@termix-ssh/plugin-sdk/testing-host";
import { LOCAL_ADAPTIVE_PREFERENCES_KEY } from "@termix-ssh/plugin-sdk/testing-host";

const { markTabSurfaceUsedMock, preloadTabSurfaceMock, hostBadgesMock } =
  vi.hoisted(() => ({
    markTabSurfaceUsedMock: vi.fn(),
    preloadTabSurfaceMock: vi.fn(),
    hostBadgesMock: vi.fn<
      () => ReturnType<typeof import("@termix-ssh/plugin-sdk/ui").useHostBadges>
    >(() => []),
  }));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      markTabSurfaceUsed: markTabSurfaceUsedMock,
      preloadTabSurface: preloadTabSurfaceMock,
      useHostBadges: hostBadgesMock,
    }),
    () => ({
      useHostStatus: () => null,
      useServerStatus: () => ({
        getStatus: () => "online",
        initialLoadComplete: true,
      }),
      useServerStatusMeta: () => ({ initialLoadComplete: true }),
    }),
    () => ({
      useStatusColorScheme: () => "accent",
      getStatusClasses: () => "",
    }),
    () => ({
      getHostPassword: vi.fn(),
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

import {
  HostItem,
  formatHostAddress,
} from "../../../../../src/frontend/sidebar/tree/HostItem/HostItem";
import { defaultHostRowFields } from "@termix-ssh/plugin-sdk/ui";

const baseHost: Host = {
  id: "1",
  name: "web-01",
  username: "root",
  ip: "10.0.0.5",
  port: 22,
  folder: "",
  online: true,
  cpu: 42,
  ram: 60,
  lastAccess: "",
  tags: ["prod", "web"],
  authType: "password",
  hasPassword: true,
  pin: true,
  enableSsh: true,
  enableTerminal: true,
  enableCommandHistory: true,
  enableTunnel: true,
  enableFileManager: true,
  enableRdp: true,
  enableVnc: true,
  enableTelnet: true,
} as unknown as Host;

const noop = () => {};

function renderHostItem(
  density: "comfortable" | "compact",
  opts: { menuOpen?: boolean } = {},
) {
  return render(
    <HostItem
      host={baseHost}
      onOpenTab={noop}
      onEditHost={noop}
      onShareHost={noop}
      onDelete={noop}
      onDuplicate={noop}
      density={density}
      isMenuOpen={opts.menuOpen ?? false}
    />,
  );
}

afterEach(() => {
  cleanup();
  markTabSurfaceUsedMock.mockClear();
  preloadTabSurfaceMock.mockClear();
  hostBadgesMock.mockReset().mockReturnValue([]);
  localStorage.removeItem(LOCAL_ADAPTIVE_PREFERENCES_KEY);
});

describe("HostItem density parity", () => {
  it.each(["comfortable", "compact"] as const)(
    "exposes the pin indicator in %s density",
    (density) => {
      renderHostItem(density);
      expect(document.querySelector(".lucide-pin")).toBeTruthy();
    },
  );

  it.each(["comfortable", "compact"] as const)(
    "exposes the Copy Link submenu trigger in %s density",
    (density) => {
      renderHostItem(density, { menuOpen: true });
      expect(screen.getByText("common.connect")).toBeTruthy();
      expect(screen.getByText("hosts.copyLink")).toBeTruthy();
    },
  );

  it("opens the complete host menu on right click", () => {
    function Harness() {
      const [menuOpen, setMenuOpen] = useState(false);
      return (
        <HostItem
          host={baseHost}
          onOpenTab={noop}
          onEditHost={noop}
          onShareHost={noop}
          onDelete={noop}
          onDuplicate={noop}
          isMenuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
        />
      );
    }
    render(<Harness />);

    const hostRow = screen.getByText("web-01").closest(".cursor-pointer");
    expect(hostRow).toBeTruthy();
    fireEvent.contextMenu(hostRow!, { clientX: 120, clientY: 80 });

    expect(screen.getByText("common.connect")).toBeTruthy();
    expect(screen.getAllByText("hosts.editHostAction").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("hosts.shareHost").length).toBeGreaterThan(0);
  });

  it.each(["comfortable", "compact"] as const)(
    "exposes edit, share, and more-options actions in %s density",
    (density) => {
      renderHostItem(density);
      expect(screen.getByTitle("hosts.editHostAction")).toBeTruthy();
      expect(screen.getByTitle("hosts.shareHost")).toBeTruthy();
      expect(screen.getByTitle("hosts.moreOptions")).toBeTruthy();
    },
  );

  it.each(["comfortable", "compact"] as const)(
    "exposes plugin connect actions as quick-launch buttons in %s density",
    (density) => {
      const Icon = (() => null) as never;
      const disposers = ["desk", "screen"].map((id) =>
        registerHostAction({
          id,
          titleKey: `fixture.${id}`,
          icon: Icon,
          kind: "connect",
          tabType: id,
          when: () => true,
        }),
      );
      try {
        renderHostItem(density);
        expect(screen.getByTitle("fixture.desk")).toBeTruthy();
        expect(screen.getByTitle("fixture.screen")).toBeTruthy();
      } finally {
        disposers.forEach((dispose) => dispose());
      }
    },
  );

  it.each(["comfortable", "compact"] as const)(
    "exposes the copy-password action in %s density",
    (density) => {
      renderHostItem(density);
      expect(screen.getByTitle("nav.copyPassword")).toBeTruthy();
    },
  );

  it.each(["hover", "click", "always", "actionsOnly"] as const)(
    "keeps the compact host address visible with %s actions",
    (trayTrigger) => {
      const props = {
        host: baseHost,
        onOpenTab: noop,
        onDelete: noop,
        onDuplicate: noop,
        density: "compact" as const,
        trayTrigger,
      };
      const { rerender } = render(<HostItem {...props} />);
      expect(screen.getByText(baseHost.ip).classList.contains("hidden")).toBe(
        false,
      );
      rerender(<HostItem {...props} isHovered />);
      expect(screen.getByText(baseHost.ip).classList.contains("hidden")).toBe(
        false,
      );
      rerender(<HostItem {...props} isTrayOpen selectionMode />);
      expect(screen.getAllByText(baseHost.ip)).toHaveLength(1);
    },
  );

  it("shows tags in both densities when showTags is true", () => {
    renderHostItem("comfortable");
    expect(screen.getByText("prod")).toBeTruthy();
    cleanup();
    renderHostItem("compact");
    expect(screen.getByText("prod")).toBeTruthy();
  });

  it("puts compact tags on the details row", () => {
    renderHostItem("compact");
    const tag = screen.getByText("prod");
    expect(tag.dataset.testid).toBe("host-inline-tag");
    expect(tag.closest("[data-drag-label]")).toBeNull();
    expect(screen.getByTestId("host-details-row").contains(tag)).toBe(true);
  });

  it("hides tags in both densities when showTags is false", () => {
    render(
      <HostItem
        host={baseHost}
        onOpenTab={noop}
        onEditHost={noop}
        onDelete={noop}
        onDuplicate={noop}
        density="comfortable"
        showTags={false}
      />,
    );
    expect(screen.queryByText("prod")).toBeNull();
  });

  it("learns repeated local actions and preloads the preferred host tool", () => {
    const Icon = (() => null) as never;
    const dispose = registerHostAction({
      id: "tmux_monitor",
      titleKey: "Tmux Monitor",
      icon: Icon,
      kind: "open",
      tabType: "tmux_monitor",
      when: () => true,
    });
    try {
      renderHostItem("comfortable");
      const tmuxButton = screen.getByTitle("Tmux Monitor");
      fireEvent.click(tmuxButton);
      fireEvent.click(tmuxButton);
      fireEvent.click(tmuxButton);

      const hostRow = screen.getByText("web-01").closest(".cursor-pointer");
      expect(hostRow).toBeTruthy();
      fireEvent.pointerEnter(hostRow!);

      // No plugin registered a connect action, so only the learned tool preloads.
      expect(preloadTabSurfaceMock).not.toHaveBeenCalledWith("");
      expect(preloadTabSurfaceMock).toHaveBeenCalledWith("tmux_monitor");
    } finally {
      dispose();
    }
  });
});

describe("HostItem compact rows", () => {
  it.each([false, true])(
    "keeps metadata below the name with selection mode %s",
    (selectionMode) => {
      hostBadgesMock.mockReturnValue([
        {
          id: "fixture-badge",
          when: () => true,
          component: () => <span>Plugin badge</span>,
        },
      ]);
      render(
        <HostItem
          host={{
            ...baseHost,
            isShared: true,
            lock: { pluginId: "fixture", pluginName: "Fixture", note: null },
          }}
          onOpenTab={noop}
          onDelete={noop}
          onDuplicate={noop}
          onToggleExpand={noop}
          density="compact"
          trayTrigger="click"
          selectionMode={selectionMode}
          selected={selectionMode}
        />,
      );

      const nameRow = screen
        .getByText(baseHost.name)
        .closest("[data-drag-label]")!;
      const details = screen.getByTestId("host-details-row");
      expect(nameRow.textContent).toBe(baseHost.name);
      expect(nameRow.querySelector(".lucide-pin")).toBeTruthy();
      expect(nameRow.querySelector(".lucide-lock")).toBeTruthy();
      expect(nameRow.contains(screen.getByTitle("hosts.expandSubHosts"))).toBe(
        true,
      );
      expect(!!nameRow.querySelector(".lucide-check")).toBe(selectionMode);
      for (const text of [
        baseHost.ip,
        "prod",
        "Plugin badge",
        "hosts.sharing.sharedBadge",
      ]) {
        const metadata = screen.getByText(text);
        expect(details.contains(metadata)).toBe(true);
        expect(nameRow.contains(metadata)).toBe(false);
      }
      expect(nameRow.querySelectorAll("button")).toHaveLength(1);
      if (selectionMode) {
        expect(screen.queryByTestId("host-inline-actions")).toBeNull();
        expect(screen.queryByTitle("hosts.expandActions")).toBeNull();
      } else {
        expect(
          details.contains(screen.getByTestId("host-inline-actions")),
        ).toBe(true);
        expect(details.contains(screen.getByTitle("hosts.expandActions"))).toBe(
          true,
        );
      }
    },
  );

  it.each(["hover", "click", "always", "actionsOnly"] as const)(
    "preserves compact action visibility in %s mode",
    (trayTrigger) => {
      const props = {
        host: baseHost,
        onOpenTab: noop,
        onEditHost: noop,
        onDelete: noop,
        onDuplicate: noop,
        density: "compact" as const,
        trayTrigger,
      };
      const { rerender } = render(<HostItem {...props} />);
      const actions = () => screen.getByTestId("host-inline-actions");
      const management = () =>
        screen.getByTitle("hosts.editHostAction").parentElement!;
      const expectVisibility = (
        visible: boolean,
        managementVisible: boolean,
      ) => {
        expect(actions().classList.contains("hidden")).toBe(!visible);
        expect(management().classList.contains("hidden")).toBe(
          !managementVisible,
        );
        expect(screen.getByText(baseHost.ip).closest(".hidden")).toBeNull();
      };

      expectVisibility(
        trayTrigger === "always" || trayTrigger === "actionsOnly",
        trayTrigger === "always",
      );
      rerender(<HostItem {...props} isHovered />);
      expectVisibility(
        trayTrigger !== "click",
        trayTrigger === "always" || trayTrigger === "hover",
      );
      rerender(<HostItem {...props} isTrayOpen />);
      expectVisibility(true, true);
      rerender(<HostItem {...props} isMenuOpen />);
      expectVisibility(true, true);
      rerender(<HostItem {...props} selectionMode isTrayOpen isHovered />);
      expect(screen.queryByTestId("host-inline-actions")).toBeNull();
      expect(screen.getByText(baseHost.ip).closest(".hidden")).toBeNull();
    },
  );

  it("toggles second-row actions and runs them without launching the host row", () => {
    const Icon = (() => null) as never;
    const dispose = registerHostAction({
      id: "compact-terminal",
      titleKey: "fixture.compactTerminal",
      icon: Icon,
      kind: "connect",
      tabType: "terminal",
      when: () => true,
    });
    const onOpenTab = vi.fn();
    const onEditHost = vi.fn();
    try {
      function Harness() {
        const [isTrayOpen, setTrayOpen] = useState(false);
        return (
          <HostItem
            host={baseHost}
            onOpenTab={onOpenTab}
            onEditHost={onEditHost}
            onDelete={noop}
            onDuplicate={noop}
            density="compact"
            trayTrigger="click"
            isTrayOpen={isTrayOpen}
            onTrayOpenChange={setTrayOpen}
          />
        );
      }
      render(<Harness />);
      const toggle = screen.getByRole("button", {
        name: "hosts.expandActions",
        expanded: false,
      });
      expect(toggle.getAttribute("type")).toBe("button");
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(onOpenTab).not.toHaveBeenCalled();
      expect(
        screen.getByTestId("host-inline-actions").classList.contains("hidden"),
      ).toBe(false);
      fireEvent.click(screen.getByTitle("hosts.editHostAction"));
      expect(onEditHost).toHaveBeenCalledOnce();
      expect(onOpenTab).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTitle("fixture.compactTerminal"));
      expect(onOpenTab).toHaveBeenCalledExactlyOnceWith("terminal", {
        forceNewTab: true,
      });
      fireEvent.click(screen.getByTitle("hosts.collapseActions"));
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(
        screen.getByTestId("host-inline-actions").classList.contains("hidden"),
      ).toBe(true);
      expect(onOpenTab).toHaveBeenCalledOnce();
    } finally {
      act(() => dispose());
    }
  });

  it("shows the full compact name, address, tags and status in the name tooltip", async () => {
    const host = {
      ...baseHost,
      tags: ["prod", "web", "all-tags-still-accessible"],
    };
    render(
      <HostItem
        host={host}
        onOpenTab={noop}
        onDelete={noop}
        onDuplicate={noop}
        density="compact"
        showTags={false}
        rowFields={{
          ...defaultHostRowFields(),
          showAddress: false,
          showUsername: false,
          showPort: false,
        }}
      />,
    );
    expect(screen.queryByText("prod")).toBeNull();
    const accessibleDetails = screen.getByText(
      "root@10.0.0.5:22, prod, web, all-tags-still-accessible",
    );
    expect(accessibleDetails.classList.contains("sr-only")).toBe(true);
    expect(
      screen.getByTestId("host-details-row").contains(accessibleDetails),
    ).toBe(true);
    await userEvent.hover(screen.getByText(host.name));
    const tooltip = await screen.findByRole("tooltip");
    for (const text of [
      host.name,
      "root@10.0.0.5:22",
      ...host.tags,
      "SSH: hosts.status.offline",
    ]) {
      expect(tooltip.textContent).toContain(text);
    }
  });

  it("keeps the comfortable name tooltip limited to status", async () => {
    renderHostItem("comfortable");
    await userEvent.hover(screen.getByText(baseHost.name));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("SSH: hosts.status.offline");
    expect(tooltip.textContent).not.toContain(baseHost.ip);
  });
});

describe("HostItem click behavior", () => {
  function setup(
    hostClickBehavior:
      "newTab" | "focusExisting" | "focusExistingDoubleClickNew",
  ) {
    const Icon = (() => null) as never;
    const dispose = registerHostAction({
      id: "terminal_test",
      titleKey: "Terminal",
      icon: Icon,
      kind: "connect",
      tabType: "terminal",
      when: () => true,
    });
    const onOpenTab = vi.fn();
    render(
      <HostItem
        host={baseHost}
        onOpenTab={onOpenTab}
        onDelete={noop}
        onDuplicate={noop}
        hostClickBehavior={hostClickBehavior}
      />,
    );
    const row = screen.getByText("web-01").closest(".cursor-pointer")!;
    return { onOpenTab, row, dispose };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("always opens a new tab by default", () => {
    const { onOpenTab, row, dispose } = setup("newTab");
    try {
      fireEvent.click(row);
      expect(onOpenTab).toHaveBeenCalledWith("terminal", { forceNewTab: true });
    } finally {
      dispose();
    }
  });

  it("switches to the open tab when set to focus existing", () => {
    const { onOpenTab, row, dispose } = setup("focusExisting");
    try {
      fireEvent.click(row);
      expect(onOpenTab).toHaveBeenCalledWith("terminal", {
        forceNewTab: false,
      });
      fireEvent.click(row, { ctrlKey: true });
      expect(onOpenTab).toHaveBeenLastCalledWith("terminal", {
        forceNewTab: true,
      });
    } finally {
      dispose();
    }
  });

  it("switches on a single click and opens a new tab on a double click", () => {
    vi.useFakeTimers();
    const { onOpenTab, row, dispose } = setup("focusExistingDoubleClickNew");
    try {
      fireEvent.click(row, { detail: 1 });
      expect(onOpenTab).not.toHaveBeenCalled();
      act(() => {
        vi.runAllTimers();
      });
      expect(onOpenTab).toHaveBeenCalledTimes(1);
      expect(onOpenTab).toHaveBeenCalledWith("terminal", {
        forceNewTab: false,
      });

      onOpenTab.mockClear();
      fireEvent.click(row, { detail: 1 });
      fireEvent.click(row, { detail: 2 });
      fireEvent.doubleClick(row);
      act(() => {
        vi.runAllTimers();
      });
      expect(onOpenTab).toHaveBeenCalledTimes(1);
      expect(onOpenTab).toHaveBeenCalledWith("terminal", { forceNewTab: true });
    } finally {
      dispose();
    }
  });
});

describe("HostItem row fields", () => {
  function renderWith(
    fields: Partial<ReturnType<typeof defaultHostRowFields>>,
  ) {
    return render(
      <HostItem
        host={baseHost}
        onOpenTab={noop}
        onEditHost={noop}
        onDelete={noop}
        onDuplicate={noop}
        density="comfortable"
        rowFields={{ ...defaultHostRowFields(), ...fields }}
      />,
    );
  }

  it("shows user@address by default", () => {
    renderWith({});
    expect(screen.getByText("root@10.0.0.5")).toBeTruthy();
  });

  it("hides the address when turned off", () => {
    renderWith({ showAddress: false });
    expect(screen.queryByText(/10\.0\.0\.5/)).toBeNull();
  });

  it("hides the pin icon when turned off", () => {
    renderWith({ showPinIcon: false });
    expect(document.querySelector(".lucide-pin")).toBeNull();
  });

  it("formats the address from the chosen parts", () => {
    expect(
      formatHostAddress(baseHost, { showUsername: false, showPort: true }),
    ).toBe("10.0.0.5:22");
    expect(
      formatHostAddress(baseHost, { showUsername: true, showPort: false }),
    ).toBe("root@10.0.0.5");
  });
});

it("uses the enabled protocol username for non-SSH hosts", () => {
  const dispose = registerHostProtocol({
    id: "rdp",
    pluginId: "remote-desktop",
    settingKey: "enableRdp",
    defaultPort: 3389,
    titleKey: "rdp",
    icon: () => null,
  });
  try {
    const host: Host = {
      ...baseHost,
      enableSsh: false,
      pluginSettings: { "remote-desktop": { enableRdp: true } },
      protocolAuth: {
        rdp: {
          authType: "credential",
          credentialId: 6,
          username: "Administrator",
          fields: {},
        },
      },
    };
    const fields = { showUsername: true, showPort: false };
    expect(formatHostAddress(host, fields)).toBe("Administrator@10.0.0.5");
    expect(formatHostAddress({ ...host, enableSsh: true }, fields)).toBe(
      "root@10.0.0.5",
    );
    expect(formatHostAddress({ ...host, protocolAuth: {} }, fields)).toBe(
      "10.0.0.5",
    );
    expect(formatHostAddress(host, { ...fields, showUsername: false })).toBe(
      "10.0.0.5",
    );
  } finally {
    dispose();
  }
});
