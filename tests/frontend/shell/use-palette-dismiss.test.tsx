import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { usePaletteDismiss } from "../../../src/frontend/shell/use-palette-dismiss";

/** A focused stand-in for the terminal, plus a palette input to move focus to. */
function setupFocus() {
  const terminal = document.createElement("textarea");
  const paletteInput = document.createElement("input");
  document.body.append(terminal, paletteInput);
  terminal.focus();
  return { terminal, paletteInput };
}

describe("usePaletteDismiss", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("closes on Escape", () => {
    const setIsOpen = vi.fn();
    renderHook(() => usePaletteDismiss(true, setIsOpen));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("returns focus to the terminal when dismissed", () => {
    const { terminal, paletteInput } = setupFocus();
    const { rerender } = renderHook(
      ({ open }) => usePaletteDismiss(open, vi.fn()),
      { initialProps: { open: true } },
    );
    paletteInput.focus();
    paletteInput.remove();
    expect(document.activeElement).toBe(document.body);

    rerender({ open: false });
    expect(document.activeElement).toBe(terminal);
  });

  it("returns focus when the palette unmounts while open", () => {
    const { terminal, paletteInput } = setupFocus();
    const { unmount } = renderHook(() => usePaletteDismiss(true, vi.fn()));
    paletteInput.focus();
    paletteInput.remove();

    unmount();
    expect(document.activeElement).toBe(terminal);
  });

  it("leaves focus to a picked action", () => {
    const { terminal, paletteInput } = setupFocus();
    const setIsOpen = vi.fn();
    const { result, unmount } = renderHook(() =>
      usePaletteDismiss(true, setIsOpen),
    );
    paletteInput.focus();
    paletteInput.remove();
    const action = vi.fn();

    act(() => result.current(action));
    unmount();
    expect(action).toHaveBeenCalledOnce();
    expect(setIsOpen).toHaveBeenCalledWith(false);
    expect(document.activeElement).not.toBe(terminal);
  });

  it("does not steal focus that moved elsewhere on close", () => {
    const { paletteInput } = setupFocus();
    const other = document.createElement("button");
    document.body.append(other);
    const { unmount } = renderHook(() => usePaletteDismiss(true, vi.fn()));
    other.focus();
    paletteInput.remove();

    unmount();
    expect(document.activeElement).toBe(other);
  });
});
