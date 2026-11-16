import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurfaceScope } from "@termix-ssh/plugin-sdk/ui";

const api = vi.hoisted(() => ({
  listUserInvites: vi.fn(async () => [] as unknown[]),
  createUserInvite: vi.fn(async () => ({
    id: "i1",
    token: "tmi_secret",
    expiresAt: "2099-01-01T00:00:00.000Z",
  })),
  revokeUserInvite: vi.fn(async () => {}),
  inviteLink: vi.fn((token: string) => `https://termix.test/?invite=${token}`),
  getAccessReview: vi.fn(async () => ({
    shares: [
      {
        kind: "host",
        accessId: 1,
        targetId: "1",
        targetName: "web-1",
        ownerId: "o",
        ownerUsername: "owner",
        granteeUserId: "u2",
        granteeUsername: "bob",
        granteeRoleId: null,
        granteeRoleName: null,
        permissionLevel: "view",
        grantedBy: "o",
        grantedByUsername: "owner",
        createdAt: "2026-11-01T00:00:00.000Z",
        expiresAt: null,
        lastAccessedAt: null,
      },
    ],
    total: 1,
  })),
  downloadAccessReviewCsv: vi.fn(async () => new Blob(["a"])),
  getUserList: vi.fn(async () => ({ users: [] })),
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { AdminInvitesSection } =
  await import("../../../src/frontend/sidebar/AdminInvitesSection");
const { AdminAccessReviewSection } =
  await import("../../../src/frontend/sidebar/AdminAccessReviewSection");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminInvitesSection", () => {
  it("makes an invite and shows its link once", async () => {
    render(
      <SurfaceScope>
        <AdminInvitesSection
          open
          onToggle={() => {}}
          roles={[]}
          canManage
          isAdmin
        />
      </SurfaceScope>,
    );
    await userEvent.click(screen.getByText("admin.inviteCreate"));
    const buttons = screen.getAllByText("admin.inviteCreate");
    await userEvent.click(buttons[buttons.length - 1]);
    await waitFor(() =>
      expect(
        screen.getByDisplayValue("https://termix.test/?invite=tmi_secret"),
      ).toBeTruthy(),
    );
    expect(api.createUserInvite).toHaveBeenCalledWith(
      expect.objectContaining({ makeAdmin: false, maxUses: 1, roleIds: [] }),
    );
  });

  it("hides the admin switch from non-admins", async () => {
    render(
      <SurfaceScope>
        <AdminInvitesSection
          open
          onToggle={() => {}}
          roles={[]}
          canManage
          isAdmin={false}
        />
      </SurfaceScope>,
    );
    await userEvent.click(screen.getByText("admin.inviteCreate"));
    expect(screen.queryByText("admin.inviteMakeAdmin")).toBeNull();
  });
});

describe("AdminAccessReviewSection", () => {
  it("lists shares and filters by kind", async () => {
    render(
      <SurfaceScope>
        <AdminAccessReviewSection open onToggle={() => {}} roles={[]} />
      </SurfaceScope>,
    );
    expect(await screen.findByText("web-1")).toBeTruthy();
    await userEvent.selectOptions(
      screen
        .getAllByLabelText("admin.accessKind")
        .find((el) => el.tagName === "SELECT") as HTMLSelectElement,
      "folder",
    );
    await waitFor(() =>
      expect(api.getAccessReview).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: "folder" }),
      ),
    );
  });

  it("keeps to one user on a user's page", async () => {
    render(
      <SurfaceScope>
        <AdminAccessReviewSection
          open
          onToggle={() => {}}
          roles={[]}
          initialUserId="u2"
        />
      </SurfaceScope>,
    );
    await waitFor(() =>
      expect(api.getAccessReview).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u2" }),
      ),
    );
    expect(screen.queryByLabelText("admin.accessUser")).toBeNull();
  });
});
