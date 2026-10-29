import { fireEvent, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { HostFolder } from "@termix-ssh/plugin-sdk/ui";
import { FolderItem } from "../../../../../src/frontend/sidebar/tree/FolderItem/FolderItem";

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({
      useServerStatus: () => ({ getStatus: () => "online" }),
      getFolderAuthOverride: async () => ({ credentialId: null }),
      setFolderAuthOverride: async () => ({ success: true }),
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
vi.mock("../../../../../src/frontend/sidebar/tree/HostItem/HostItem", () => ({
  HostItem: () => null,
  statusCheckEnabled: () => true,
}));

const folder = {
  name: "Production",
  path: "Production",
  children: [],
} as unknown as HostFolder;

function renderFolder(onToggleFolder = vi.fn(), target = folder) {
  const noop = vi.fn();
  render(
    <FolderItem
      folder={target}
      flat
      onOpenTab={noop}
      onDeleteHost={noop}
      onDuplicateHost={noop}
      openFolders={new Set()}
      onToggleFolder={onToggleFolder}
      selectionMode={false}
      selectedHostIds={new Set()}
      onToggleSelect={noop}
      onToggleSelectFolder={noop}
      openMenuHostId={null}
      onMenuOpenChange={noop}
      openTrayHostId={null}
      onTrayOpenChange={noop}
      onManageFolder={noop}
      onDeleteFolder={noop}
      onOpenAllSessions={noop}
      onMoveHostsToFolder={noop}
      draggedHostIds={null}
      onDragHostStart={noop}
      onDragEnd={noop}
    />,
  );
  return onToggleFolder;
}

it("never nests the folder actions inside a button element", () => {
  renderFolder();
  for (const button of document.querySelectorAll("button")) {
    expect(button.parentElement?.closest("button")).toBeNull();
  }
});

it("toggles the folder by click, Enter and Space", () => {
  const onToggle = renderFolder();
  const header = document.querySelector('[role="button"][aria-expanded]')!;
  fireEvent.click(header);
  fireEvent.keyDown(header, { key: "Enter" });
  fireEvent.keyDown(header, { key: " " });
  expect(onToggle).toHaveBeenCalledTimes(3);
  expect(onToggle).toHaveBeenCalledWith("Production");
});

it("ignores keys pressed on a folder action", () => {
  const onToggle = renderFolder();
  const action = document.querySelector("button")!;
  fireEvent.keyDown(action, { key: "Enter" });
  expect(onToggle).not.toHaveBeenCalled();
});

it("marks a folder of managed hosts and hides rename and delete", () => {
  const managed = {
    ...folder,
    children: [{ id: "1", name: "a", lock: { pluginName: "Sync" } }],
  } as unknown as HostFolder;
  renderFolder(vi.fn(), managed);
  expect(
    document.querySelector('[data-testid="folder-managed-marker"]'),
  ).not.toBeNull();
  const titles = [...document.querySelectorAll("button")].map((b) => b.title);
  expect(titles).not.toContain("hosts.editFolder");
  expect(titles).not.toContain("hosts.deleteFolder");
});

it("leaves a normal folder editable", () => {
  renderFolder();
  expect(
    document.querySelector('[data-testid="folder-managed-marker"]'),
  ).toBeNull();
  const titles = [...document.querySelectorAll("button")].map((b) => b.title);
  expect(titles).toContain("hosts.editFolder");
});

it("offers a personal login only on folders with shared hosts", () => {
  const shared = {
    ...folder,
    children: [{ id: "1", name: "a", isShared: true }],
  } as unknown as HostFolder;
  renderFolder(vi.fn(), shared);
  const titles = [...document.querySelectorAll("button")].map((b) => b.title);
  expect(titles).toContain("sharing.folderLogin.action");
});

it("has no personal login on a folder of your own hosts", () => {
  const own = {
    ...folder,
    children: [{ id: "1", name: "a" }],
  } as unknown as HostFolder;
  renderFolder(vi.fn(), own);
  const titles = [...document.querySelectorAll("button")].map((b) => b.title);
  expect(titles).not.toContain("sharing.folderLogin.action");
});
