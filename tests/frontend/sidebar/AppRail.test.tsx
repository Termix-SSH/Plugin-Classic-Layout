import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bell, Boxes } from "lucide-react";
import { AppRail } from "../../../src/frontend/sidebar/AppRail";
import { RailBadge, RailStatus } from "../../../src/frontend/sidebar/RailBadge";
import {
  registerRailItem,
  resetRegisteredRailItems,
} from "@termix-ssh/plugin-sdk/testing-host";

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

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      getUserPreferences: vi.fn(async () => ({ storageMode: "local" })),
      saveUserPreferences: vi.fn(async () => undefined),
    }),
    () => ({
      usePermissions: () => ({ has: () => true, loaded: true }),
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

// Every app on the rail unless a test unpins some.
const pins = vi.hoisted(() => ({
  appsMenu: false,
  locked: false,
  pinned: new Set<string>(),
  toggle: vi.fn(),
}));
vi.mock("../../../src/frontend/rail-pins", () => ({
  useRailPins: () => ({
    appsMenu: pins.appsMenu,
    locked: pins.locked,
    isPinned: (item: { id: string; pluginId?: string }) =>
      !pins.appsMenu || !item.pluginId || pins.pinned.has(item.id),
    toggle: pins.toggle,
  }),
}));
vi.mock("../../../src/frontend/settings/FeatureSettingsSections", () => ({
  useFeatureSettings: () => [{ id: "demo" }],
}));

afterEach(() => {
  pins.appsMenu = false;
  pins.locked = false;
  pins.pinned = new Set();
  pins.toggle.mockReset();
  resetRegisteredRailItems();
  localStorage.clear();
  delete (window as { IS_ELECTRON?: boolean }).IS_ELECTRON;
});

function renderRail(onRailClick = vi.fn()) {
  render(
    <AppRail
      railView="hosts"
      sidebarOpen={false}
      username="alice"
      isAdmin={false}
      onRailClick={onRailClick}
      onOpenSettings={vi.fn()}
      onOpenNavigationSettings={vi.fn()}
      onLogout={vi.fn()}
    />,
  );
  return onRailClick;
}

describe("AppRail", () => {
  it("shows logout in the browser but not on the desktop", () => {
    renderRail();
    expect(screen.getByLabelText("common.logout")).toBeTruthy();
    cleanup();
    (window as { IS_ELECTRON?: boolean }).IS_ELECTRON = true;
    renderRail();
    expect(screen.queryByLabelText("common.logout")).toBeNull();
  });

  it("expands over the content on hover without taking more room", () => {
    renderRail();
    const rail = screen
      .getByLabelText("common.logout")
      .closest(".absolute") as HTMLElement;
    const slot = rail.parentElement as HTMLElement;
    const collapsed = slot.style.width;
    fireEvent.mouseEnter(rail);
    expect(rail.style.width).not.toBe(collapsed);
    expect(slot.style.width).toBe(collapsed);
  });

  it("pushes the content on hover when the user asks for it", () => {
    localStorage.setItem("appRailHoverPushesContent", "true");
    renderRail();
    const rail = screen
      .getByLabelText("common.logout")
      .closest(".absolute") as HTMLElement;
    const slot = rail.parentElement as HTMLElement;
    fireEvent.mouseEnter(rail);
    expect(slot.style.width).toBe(rail.style.width);
  });

  it("puts a footer item above the profile with its badge", async () => {
    registerRailItem({
      id: "inbox",
      icon: Bell,
      labelKey: "test.inbox",
      placement: "footer",
      useBadge: () => 3,
      pluginId: "demo",
    });
    registerRailItem({
      id: "boxes",
      icon: Boxes,
      labelKey: "test.boxes",
      pluginId: "demo",
    });
    const onRailClick = renderRail();

    const inbox = screen.getByTitle("test.inbox");
    const profile = screen.getAllByTitle("nav.openSettings")[0];
    const boxes = screen.getByTitle("test.boxes");
    // Footer items render after the main list and before the profile.
    expect(
      boxes.compareDocumentPosition(inbox) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      inbox.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(inbox.textContent).toContain("3");

    await userEvent.click(inbox);
    expect(onRailClick).toHaveBeenCalledWith("inbox");
  });

  it("shows the status dot an item reports", () => {
    registerRailItem({
      id: "inbox",
      icon: Bell,
      labelKey: "test.inbox",
      placement: "footer",
      useStatus: () => "error",
      pluginId: "demo",
    } as never);
    renderRail();
    const dot = screen
      .getByTitle("test.inbox")
      .querySelector("[data-tone]") as HTMLElement;
    expect(dot.dataset.tone).toBe("error");
  });

  it("hides a footer item the user hid from Navigation", () => {
    localStorage.setItem("hiddenRailTabs", JSON.stringify(["inbox"]));
    registerRailItem({
      id: "inbox",
      icon: Bell,
      labelKey: "test.inbox",
      placement: "footer",
      pluginId: "demo",
    });
    renderRail();
    expect(screen.queryByTitle("test.inbox")).toBeNull();
  });

  it("groups items into bands with a labelled divider", () => {
    registerRailItem({
      id: "fleets",
      icon: Boxes,
      labelKey: "test.fleets",
      group: "objects",
      pluginId: "demo",
    });
    renderRail();
    expect(screen.getByText("nav.group.tools")).toBeTruthy();
    const fleets = screen.getByTitle("test.fleets");
    const connections = screen.getByTitle("nav.connections");
    expect(
      fleets.compareDocumentPosition(connections) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lists hidden items and brings one back", async () => {
    localStorage.setItem("hiddenRailTabs", JSON.stringify(["connections"]));
    renderRail();
    expect(screen.queryByTitle("nav.connections")).toBeNull();
    await userEvent.click(screen.getByTitle("nav.hiddenCount"));
    await userEvent.click(screen.getByTitle("nav.showInRail"));
    expect(JSON.parse(localStorage.getItem("hiddenRailTabs")!)).toEqual([]);
    expect(await screen.findByTitle("nav.connections")).toBeTruthy();
  });

  it("opens plain settings from the account button", async () => {
    const onOpenSettings = vi.fn();
    const onOpenNavigationSettings = vi.fn();
    render(
      <AppRail
        railView="hosts"
        sidebarOpen={false}
        username="alice"
        isAdmin
        onRailClick={vi.fn()}
        onOpenSettings={onOpenSettings}
        onOpenNavigationSettings={onOpenNavigationSettings}
        onLogout={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText("nav.openSettings"));
    expect(onOpenSettings).toHaveBeenCalled();
    expect(onOpenNavigationSettings).not.toHaveBeenCalled();
  });

  it("opens the navigation settings from the rail menu", async () => {
    const onOpenSettings = vi.fn();
    const onOpenNavigationSettings = vi.fn();
    render(
      <AppRail
        railView="hosts"
        sidebarOpen={false}
        username="alice"
        isAdmin
        onRailClick={vi.fn()}
        onOpenSettings={onOpenSettings}
        onOpenNavigationSettings={onOpenNavigationSettings}
        onLogout={vi.fn()}
      />,
    );
    fireEvent.contextMenu(screen.getByTitle("nav.connections"));
    await userEvent.click(screen.getByText("nav.openSettings"));
    expect(onOpenNavigationSettings).toHaveBeenCalled();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });
});

describe("AppRail apps menu", () => {
  function registerTwo() {
    registerRailItem({
      id: "fleets",
      icon: Boxes,
      labelKey: "test.fleets",
      pluginId: "demo",
    });
    registerRailItem({
      id: "inbox",
      icon: Bell,
      labelKey: "test.inbox",
      pluginId: "demo",
    });
  }

  it("keeps unpinned apps in All apps and opens one from there", async () => {
    pins.appsMenu = true;
    pins.pinned = new Set(["fleets"]);
    registerTwo();
    const onRailClick = renderRail();
    expect(screen.getByTitle("test.fleets")).toBeTruthy();
    expect(screen.queryByTitle("test.inbox")).toBeNull();

    await userEvent.click(screen.getByTitle("nav.allApps"));
    const dialog = screen.getByRole("dialog", { name: "nav.allApps" });
    await userEvent.click(within(dialog).getByText("test.inbox"));
    expect(onRailClick).toHaveBeenCalledWith("inbox");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("pins an app from All apps", async () => {
    pins.appsMenu = true;
    registerTwo();
    renderRail();
    await userEvent.click(screen.getByTitle("nav.allApps"));
    const dialog = screen.getByRole("dialog", { name: "nav.allApps" });
    await userEvent.click(within(dialog).getAllByLabelText("nav.pinToRail")[0]);
    expect(pins.toggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "fleets" }),
      expect.any(Array),
    );
  });

  it("finds an app by name", async () => {
    pins.appsMenu = true;
    registerTwo();
    renderRail();
    await userEvent.click(screen.getByTitle("nav.allApps"));
    const dialog = screen.getByRole("dialog", { name: "nav.allApps" });
    await userEvent.type(within(dialog).getByRole("textbox"), "inb");
    expect(within(dialog).queryByText("test.fleets")).toBeNull();
    expect(within(dialog).getByText("test.inbox")).toBeTruthy();
  });

  it("hides the pin buttons when the admin locked the rail", async () => {
    pins.appsMenu = true;
    pins.locked = true;
    registerTwo();
    renderRail();
    await userEvent.click(screen.getByTitle("nav.allApps"));
    expect(screen.queryByLabelText("nav.pinToRail")).toBeNull();
    expect(screen.getByText("nav.allAppsLockedHint")).toBeTruthy();
  });

  it("shows no All apps button when every app is on the rail", () => {
    registerTwo();
    renderRail();
    expect(screen.queryByTitle("nav.allApps")).toBeNull();
    expect(screen.getByTitle("test.inbox")).toBeTruthy();
  });

  it("opens an app's settings and unpins it from the rail menu", async () => {
    pins.appsMenu = true;
    pins.pinned = new Set(["fleets"]);
    registerTwo();
    const onOpenAppSettings = vi.fn();
    render(
      <AppRail
        railView="hosts"
        sidebarOpen={false}
        username="alice"
        isAdmin={false}
        onRailClick={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenNavigationSettings={vi.fn()}
        onOpenAppSettings={onOpenAppSettings}
        onLogout={vi.fn()}
      />,
    );
    fireEvent.contextMenu(screen.getByTitle("test.fleets"));
    expect(screen.queryByText("nav.hideFromRail")).toBeNull();
    await userEvent.click(screen.getByText("nav.appSettings"));
    expect(onOpenAppSettings).toHaveBeenCalledWith("demo");

    fireEvent.contextMenu(screen.getByTitle("test.fleets"));
    await userEvent.click(screen.getByText("nav.unpinFromRail"));
    expect(pins.toggle).toHaveBeenCalled();
  });
});

describe("RailBadge", () => {
  it("shows nothing for zero", () => {
    const { container } = render(<RailBadge useBadge={() => 0} />);
    expect(container.textContent).toBe("");
  });

  it("shows no dot without a status", () => {
    const { container } = render(<RailStatus useStatus={() => null} />);
    expect(container.innerHTML).toBe("");
  });

  it("caps a large count", () => {
    render(<RailBadge useBadge={() => 150} />);
    expect(screen.getByText("99+")).toBeTruthy();
  });
});
