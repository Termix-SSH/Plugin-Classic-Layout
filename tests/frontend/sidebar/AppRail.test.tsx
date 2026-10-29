import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

afterEach(() => {
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
