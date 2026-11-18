import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({
  theme: "dark",
  choose: vi.fn(),
  options: [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
  ] as { id: string; label: string }[],
}));
vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTheme: () => ({ theme: state.theme }),
  useChooseTheme: () => state.choose,
  useThemeOptions: () => state.options,
}));

import { ThemeMenu } from "../../../src/frontend/sidebar/AppRail";

afterEach(() => {
  cleanup();
  state.choose.mockClear();
});

describe("ThemeMenu", () => {
  it("lists the themes and switches to the one picked", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu expanded />);
    await user.click(screen.getByRole("button", { name: "nav.theme" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Light" }),
    );
    expect(state.choose).toHaveBeenCalledWith("light");
  });

  it("hides itself when there is only one theme", () => {
    state.options = [{ id: "dark", label: "Dark" }];
    render(<ThemeMenu expanded />);
    expect(screen.queryByRole("button", { name: "nav.theme" })).toBeNull();
  });
});
