import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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

import { ManageList } from "../../../src/frontend/manage/ManageList";
import type { Credential, Host } from "@termix-ssh/plugin-sdk/ui";

afterEach(cleanup);

const hosts = [
  { id: "1", name: "web-01", ip: "10.0.0.1", folder: "Prod", tags: [] },
  { id: "2", name: "db-01", ip: "10.0.0.2", folder: "Prod", tags: ["sql"] },
] as unknown as Host[];
const credentials = [
  { id: "c1", name: "deploy", username: "ci", folder: "" },
] as Credential[];

function renderList(overrides: Partial<Parameters<typeof ManageList>[0]> = {}) {
  const props = {
    editing: false,
    mode: "hosts" as const,
    onMode: vi.fn(),
    hosts,
    credentials,
    canEditInstanceDefaults: false,
    isOnline: () => false,
    selectedKey: null,
    onPickHost: vi.fn(),
    onPickCredential: vi.fn(),
    onPickDefaults: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(<ManageList {...props} />);
  return props;
}

describe("ManageList", () => {
  it("lists hosts under their folder and picks one", () => {
    const props = renderList();
    expect(screen.getByText("Prod")).toBeTruthy();
    fireEvent.click(screen.getByText("db-01"));
    expect(props.onPickHost).toHaveBeenCalledWith(hosts[1]);
  });

  it("filters by tags as well as names", () => {
    renderList();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "sql" } });
    expect(screen.queryByText("web-01")).toBeNull();
    expect(screen.getByText("db-01")).toBeTruthy();
  });

  it("switches mode and adds", () => {
    const props = renderList();
    fireEvent.click(screen.getByText("nav.credentials"));
    expect(props.onMode).toHaveBeenCalledWith("credentials");
    fireEvent.click(screen.getByLabelText("hosts.addHost"));
    expect(props.onAdd).toHaveBeenCalled();
  });

  it("opens folders that appear after the list loads", () => {
    const props = {
      editing: false,
      mode: "hosts" as const,
      onMode: vi.fn(),
      credentials,
      canEditInstanceDefaults: false,
      isOnline: () => false,
      selectedKey: null,
      onPickHost: vi.fn(),
      onPickCredential: vi.fn(),
      onPickDefaults: vi.fn(),
      onAdd: vi.fn(),
    };
    const { rerender } = render(<ManageList {...props} hosts={[]} />);
    rerender(<ManageList {...props} hosts={hosts} />);
    expect(screen.getByText("web-01")).toBeTruthy();
  });

  it("lists levels of defaults", () => {
    const props = renderList({ mode: "defaults" });
    fireEvent.click(screen.getByText("hostDefaults.titleUser"));
    expect(props.onPickDefaults).toHaveBeenCalledWith(
      expect.objectContaining({ level: "user" }),
    );
    expect(screen.getByText("Prod")).toBeTruthy();
  });
});
