import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminUserManagePanel } from "../../../src/frontend/sidebar/AdminUserManagePanel";
import { SurfaceScope } from "@termix-ssh/plugin-sdk/ui";
import type { AdminUser } from "../../../src/frontend/sidebar/AdminManagementSections";

const api = vi.hoisted(() => ({
  adminGetUserHosts: vi.fn(async () => [] as unknown[]),
  adminDeleteUserHost: vi.fn(async () => ({})),
  adminGetUserCredentials: vi.fn(async () => [] as unknown[]),
  adminDeleteUserCredential: vi.fn(async () => ({})),
  adminResetUserPassword: vi.fn(async () => ({ dataWiped: false })),
  adminExportUserData: vi.fn(async () => ({})),
  getSessions: vi.fn(async () => ({ sessions: [] as unknown[] })),
  revokeSession: vi.fn(async () => ({})),
  revokeAllUserSessions: vi.fn(async () => ({})),
  getApiKeys: vi.fn(async () => ({ apiKeys: [] as unknown[] })),
  createApiKey: vi.fn(async () => ({})),
  deleteApiKey: vi.fn(async () => ({})),
  deleteUser: vi.fn(async () => ({})),
  getUserList: vi.fn(async () => ({ users: [] })),
  getUserRoles: vi.fn(async () => ({ roles: [] as unknown[] })),
  assignRoleToUser: vi.fn(async () => ({})),
  removeRoleFromUser: vi.fn(async () => ({})),
  disableUser: vi.fn(async () => ({ disabled: true })),
  enableUser: vi.fn(async () => ({ disabled: false })),
  adminUpdateUserProfile: vi.fn(async () => ({})),
  getAccessReview: vi.fn(async () => ({ shares: [], total: 0 })),
  downloadAccessReviewCsv: vi.fn(async () => new Blob()),
  usePermissions: vi.fn(() => ({
    permissions: ["*"],
    isAdmin: true,
    loaded: true,
    has: () => true,
  })),
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [() => api];
  for (const factory of factories) {
    Object.assign(
      merged,
      await factory((async () => ({ ...merged })) as never),
    );
  }
  return merged;
});

vi.mock("../../../src/frontend/sidebar/HostEditor", () => ({
  HostEditor: () => <div data-testid="host-editor" />,
}));

vi.mock("../../../src/frontend/sidebar/CredentialEditorView", () => ({
  CredentialEditorView: () => <div data-testid="credential-editor" />,
}));

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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "u2",
    username: "bob",
    isAdmin: false,
    isExternal: false,
    passwordHash: "hash",
    dataUnlocked: true,
    ...overrides,
  };
}

function renderPanel(
  user: AdminUser,
  callbacks: Partial<Record<string, () => void>> = {},
) {
  return render(
    <SurfaceScope>
      <AdminUserManagePanel
        user={user}
        roles={[]}
        onBack={callbacks.onBack ?? vi.fn()}
        onOpenHostTab={callbacks.onOpenHostTab as never}
        onUserDeleted={callbacks.onUserDeleted ?? vi.fn()}
        onSecondFactorsReset={callbacks.onSecondFactorsReset ?? vi.fn()}
      />
    </SurfaceScope>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  for (const fn of Object.values(api)) fn.mockClear();
});

describe("AdminUserManagePanel", () => {
  it("renders all manage tabs and loads the target user's data", async () => {
    renderPanel(makeUser());

    for (const tab of [
      "admin.manageTabAccount",
      "admin.manageTabHosts",
      "admin.manageTabCredentials",
      "admin.manageTabSessions",
      "admin.manageTabDanger",
    ]) {
      expect(screen.getByText(tab)).toBeTruthy();
    }

    await waitFor(() => {
      expect(api.adminGetUserHosts).toHaveBeenCalledWith("u2");
      expect(api.adminGetUserCredentials).toHaveBeenCalledWith("u2");
      expect(api.getUserRoles).toHaveBeenCalledWith("u2");
    });
  });

  it("skips data fetches and shows the locked notice when data is locked", async () => {
    renderPanel(makeUser({ dataUnlocked: false }));

    expect(screen.getByText("admin.dataLockedBadge")).toBeTruthy();

    await userEvent.click(screen.getByText("admin.manageTabHosts"));
    expect(screen.getByText("admin.dataLockedNotice")).toBeTruthy();
    expect(screen.queryByText("admin.addHostForUser")).toBeNull();

    expect(api.adminGetUserHosts).not.toHaveBeenCalled();
    expect(api.adminGetUserCredentials).not.toHaveBeenCalled();
  });

  it("lists the user's hosts and opens a tab via the connect button", async () => {
    api.adminGetUserHosts.mockResolvedValueOnce([
      {
        id: 7,
        name: "web-01",
        username: "root",
        ip: "10.0.0.5",
        port: 22,
        authType: "password",
        connectionType: "ssh",
      },
    ]);
    const onOpenHostTab = vi.fn();
    renderPanel(makeUser(), { onOpenHostTab });

    await userEvent.click(screen.getByText("admin.manageTabHosts"));
    await screen.findByText("web-01");

    await userEvent.click(screen.getByTitle("admin.connectToHost"));
    expect(onOpenHostTab).toHaveBeenCalledTimes(1);
    expect(onOpenHostTab.mock.calls[0][0]).toMatchObject({
      id: "7",
      ip: "10.0.0.5",
    });
  });

  it("shows a tab a plugin contributes, with the user it manages", async () => {
    const { registerSlotContribution } =
      await import("@termix-ssh/plugin-sdk/testing-host");
    const dispose = registerSlotContribution("admin.userTabs", {
      actionId: "fixture.adminTab",
      titleKey: "fixture.tabTitle",
      kind: "component",
      component: ((props: { user: AdminUser }) => (
        <div>managing {props.user.username}</div>
      )) as never,
    });
    try {
      renderPanel(makeUser());
      await userEvent.click(screen.getByText("fixture.tabTitle"));
      expect(screen.getByText("managing bob")).toBeTruthy();
    } finally {
      dispose();
    }
  });

  it("shows the locked notice instead of a plugin tab while data is locked", async () => {
    const { registerSlotContribution } =
      await import("@termix-ssh/plugin-sdk/testing-host");
    const dispose = registerSlotContribution("admin.userTabs", {
      actionId: "fixture.adminTab",
      titleKey: "fixture.tabTitle",
      kind: "component",
      component: (() => <div>plugin content</div>) as never,
    });
    try {
      renderPanel(makeUser({ dataUnlocked: false }));
      await userEvent.click(screen.getByText("fixture.tabTitle"));
      expect(screen.queryByText("plugin content")).toBeNull();
      expect(screen.getByText("admin.dataLockedNotice")).toBeTruthy();
    } finally {
      dispose();
    }
  });

  it("deletes the user from the danger tab after confirmation", async () => {
    const onUserDeleted = vi.fn();
    renderPanel(makeUser(), { onUserDeleted });

    await userEvent.click(screen.getByText("admin.manageTabDanger"));
    await userEvent.click(screen.getByText("admin.deleteUser"));
    await userEvent.click(screen.getByText("common.delete"));

    await waitFor(() => {
      expect(api.deleteUser).toHaveBeenCalledWith("bob");
      expect(onUserDeleted).toHaveBeenCalled();
    });
  });

  it("turns an account off after confirmation", async () => {
    renderPanel(makeUser({}));
    await userEvent.click(screen.getByText("admin.disableUser"));
    await userEvent.click(screen.getByText("common.delete"));
    await waitFor(() => expect(api.disableUser).toHaveBeenCalledWith("u2"));
  });

  it("shows only account tabs to a helpdesk role", async () => {
    api.usePermissions.mockReturnValue({
      permissions: ["admin.users.view", "admin.users.manage"],
      isAdmin: false,
      loaded: true,
      has: () => true,
    });
    try {
      renderPanel(makeUser({}));
      expect(screen.queryByText("admin.manageTabHosts")).toBeNull();
      expect(screen.getByText("admin.manageTabAccess")).toBeTruthy();
      await userEvent.click(screen.getByText("admin.manageTabDanger"));
      expect(screen.queryByText("admin.deleteSuccessorMe")).toBeNull();
    } finally {
      api.usePermissions.mockReturnValue({
        permissions: ["*"],
        isAdmin: true,
        loaded: true,
        has: () => true,
      });
    }
  });

  it("blocks deleting admin accounts", async () => {
    renderPanel(makeUser({ isAdmin: true }));

    await userEvent.click(screen.getByText("admin.manageTabDanger"));
    const deleteBtn = screen
      .getByText("admin.deleteUser")
      .closest("button") as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
    expect(screen.getByText("admin.deleteUserAdminBlocked")).toBeTruthy();
  });
});
