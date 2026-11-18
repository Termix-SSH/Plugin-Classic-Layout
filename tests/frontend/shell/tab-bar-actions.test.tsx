import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TabBarActions } from "../../../src/frontend/shell/TabBarActions";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("tab bar plugin buttons", () => {
  it("draws no divider for a button that has not loaded yet", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.width ? Number(this.dataset.width) : 0;
      },
    );
    const { container } = render(
      <TabBarActions>
        <button data-width="50">tools</button>
        <iframe title="loading" />
      </TabBarActions>,
    );
    const [loaded, loading] = Array.from(
      container.querySelector("[data-tabbar-actions]")!.children,
    );
    expect(loaded.hasAttribute("data-bar-shown")).toBe(true);
    expect(loading.hasAttribute("data-bar-shown")).toBe(false);
  });

  it("has no border of its own when nothing has loaded", () => {
    const { container } = render(
      <TabBarActions>
        <iframe title="loading" />
      </TabBarActions>,
    );
    const box = container.querySelector("[data-tabbar-actions]")!;
    expect(box.className).not.toMatch(/(^| )border-r( |$)/);
    expect(box.firstElementChild!.hasAttribute("data-bar-shown")).toBe(false);
  });
});
