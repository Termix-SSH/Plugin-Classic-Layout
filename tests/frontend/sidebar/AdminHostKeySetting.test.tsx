import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getHostKeyPolicy: vi.fn(),
  updateHostKeyPolicy: vi.fn(),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { AdminHostKeySetting } from "../../../src/frontend/sidebar/AdminHostKeySetting";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminHostKeySetting", () => {
  it("turns trust on first use on", async () => {
    api.getHostKeyPolicy.mockResolvedValue({ trustOnFirstUse: false });
    api.updateHostKeyPolicy.mockResolvedValue({ trustOnFirstUse: true });
    render(<AdminHostKeySetting />);
    expect(await screen.findByText("admin.hostKeyTrust")).toBeTruthy();
    const toggle = await screen.findByRole("switch");
    await vi.waitFor(() =>
      expect((toggle as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(toggle);
    await vi.waitFor(() =>
      expect(api.updateHostKeyPolicy).toHaveBeenCalledWith(true),
    );
  });
});
