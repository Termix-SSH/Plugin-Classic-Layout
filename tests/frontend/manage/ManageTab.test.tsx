import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { pending, never } = vi.hoisted(() => ({
  pending: { current: null as unknown },
  never: () => new Promise<never>(() => {}),
}));

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PanelShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useConfirm: () => async () => true,
  useUiPreference: () => "full",
  usePermissions: () => ({ has: () => true }),
  useServerStatus: () => ({ statuses: {} }),
  registerTabCloseGuard: () => () => {},
  getSSHHosts: vi.fn(never),
  getCredentials: vi.fn(never),
  takePendingManageRequest: () => {
    const request = pending.current;
    pending.current = null;
    return request;
  },
}));
vi.mock("../../../src/frontend/sidebar/HostEditor", () => ({
  HostEditor: () => <div>host-editor</div>,
}));
vi.mock("../../../src/frontend/sidebar/CredentialEditorView", () => ({
  CredentialEditorView: () => <div>credential-editor</div>,
}));
vi.mock("../../../src/frontend/sidebar/use-host-policy", () => ({
  useHostPolicy: () => ({ manualCreate: true }),
}));
vi.mock("../../../src/frontend/manage/ManageList", () => ({
  ManageList: () => <div>list</div>,
}));

import { ManageTab } from "../../../src/frontend/manage/ManageTab";

afterEach(() => {
  cleanup();
  pending.current = null;
});

describe("ManageTab", () => {
  it("opens a new host form without waiting for the host list", async () => {
    pending.current = { kind: "host" };
    render(<ManageTab />);
    expect(await screen.findByText("host-editor")).toBeTruthy();
  });

  it("opens a new credential form without waiting for the list", async () => {
    pending.current = { kind: "credential" };
    render(<ManageTab />);
    expect(await screen.findByText("credential-editor")).toBeTruthy();
  });
});
