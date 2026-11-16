import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mobile = vi.hoisted(() => ({ value: true }));
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
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const merged: Record<string, unknown> = { ...original };
  const factories: Array<
    (importOriginal: <T = Record<string, unknown>>() => Promise<T>) => unknown
  > = [
    () => ({ useIsMobile: () => mobile.value }),
    async (importOriginal) => ({
      ...(await importOriginal<typeof import("@termix-ssh/plugin-sdk/ui")>()),
      ComponentSlot: ({ slotId }: { slotId: string }) => <span>{slotId}</span>,
      DataSlot: ({
        slotId,
        fallback,
      }: {
        slotId: string;
        fallback?: unknown;
      }) => (slotId === "dashboard.hostRow" ? <span>{slotId}</span> : fallback),
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
import { HostStatusCard } from "../../../src/frontend/dashboard/DashboardTab";
import type { Host } from "@termix-ssh/plugin-sdk/ui";

afterEach(cleanup);

const host = { id: "1", name: "web", ip: "10.0.0.1", online: true } as Host;

describe("HostStatusCard on a phone", () => {
  it("leaves out plugin metrics so the host name has room", () => {
    mobile.value = true;
    render(<HostStatusCard hosts={[host]} onOpenTab={() => {}} />);
    expect(screen.queryByText("dashboard.hostRow")).toBeNull();
  });

  it("keeps them on a wide screen", () => {
    mobile.value = false;
    render(<HostStatusCard hosts={[host]} onOpenTab={() => {}} />);
    expect(screen.getByText("dashboard.hostRow")).toBeTruthy();
  });
});
