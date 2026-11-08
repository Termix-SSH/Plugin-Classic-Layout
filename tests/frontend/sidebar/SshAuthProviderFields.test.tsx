import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const update = vi.fn(async () => {});
let setValue: ((key: string, value: unknown) => void) | null = null;

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getPluginHostSettings: vi.fn(async () => ({})),
  updatePluginHostSettings: (...args: unknown[]) => update(...(args as [])),
  SettingsFieldRow: (props: {
    setValue: (key: string, value: unknown) => void;
  }) => {
    setValue = props.setValue;
    return null;
  },
}));

import { SshAuthProviderFields } from "../../../src/frontend/sidebar/SshAuthProviderFields";

const fields = [
  { key: "a", type: "text" },
  { key: "b", type: "text" },
] as never;

describe("SshAuthProviderFields", () => {
  afterEach(() => {
    vi.useRealTimers();
    update.mockClear();
  });

  it("saves every field changed in one burst", async () => {
    vi.useFakeTimers();
    render(<SshAuthProviderFields pluginId="p" hostId={7} fields={fields} />);
    act(() => {
      setValue!("a", "1");
      setValue!("b", "2");
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("p", 7, { a: "1", b: "2" });
  });

  it("saves a pending change when it closes", () => {
    vi.useFakeTimers();
    const view = render(
      <SshAuthProviderFields pluginId="p" hostId={7} fields={fields} />,
    );
    act(() => setValue!("a", "x"));
    view.unmount();
    expect(update).toHaveBeenCalledWith("p", 7, { a: "x" });
  });
});
