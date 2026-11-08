import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getHttpsSettings: vi.fn(),
  updateHttpsSettings: vi.fn(),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { AdminHttpsSetting } from "../../../src/frontend/sidebar/AdminHttpsSetting";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminHttpsSetting", () => {
  it("turns the redirect on", async () => {
    api.getHttpsSettings.mockResolvedValue({
      forceHttps: false,
      tlsEnabled: true,
    });
    api.updateHttpsSettings.mockResolvedValue({
      forceHttps: true,
      tlsEnabled: true,
    });
    render(<AdminHttpsSetting />);
    expect(await screen.findByText("admin.forceHttps")).toBeTruthy();
    const toggle = await screen.findByRole("switch");
    await vi.waitFor(() =>
      expect((toggle as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(toggle);
    await vi.waitFor(() =>
      expect(api.updateHttpsSettings).toHaveBeenCalledWith(true),
    );
    expect(screen.queryByText("admin.forceHttpsNoTls")).toBeNull();
  });

  it("says nothing is redirected while HTTPS is off", async () => {
    api.getHttpsSettings.mockResolvedValue({
      forceHttps: true,
      tlsEnabled: false,
    });
    render(<AdminHttpsSetting />);
    expect(await screen.findByText("admin.forceHttpsNoTls")).toBeTruthy();
  });
});
