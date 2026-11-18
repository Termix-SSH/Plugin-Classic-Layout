import { afterEach, describe, expect, it, vi } from "vitest";

// The SDK's test host may predate the simple flag, so mark "own" here.
vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => {
  const ui = await importOriginal<Record<string, unknown>>();
  const get = ui.getHostEditorSection as (id: string) => object | undefined;
  return {
    ...ui,
    getHostEditorSection: (id: string) => {
      const section = get(id);
      return section && id === "own" ? { ...section, simple: true } : section;
    },
  };
});
import { act, cleanup, screen } from "@testing-library/react";
import { renderWithApp } from "@termix-ssh/plugin-sdk/testing";
import type { TermixApp } from "@termix-ssh/plugin-sdk/frontend";
import { HostEditor } from "../../../src/frontend/sidebar/HostEditor";

let dispose: (() => void) | null = null;

afterEach(() => {
  dispose?.();
  dispose = null;
  cleanup();
});

describe("HostEditor sections", () => {
  it("lists a section a plugin registers after the editor opened", async () => {
    let app: TermixApp | null = null;
    const rendered = await renderWithApp(
      {
        activate: (given: TermixApp) => {
          app = given;
          given.registerPanel("editor", () => (
            <HostEditor
              host={null}
              onBack={() => {}}
              onSave={() => {}}
              protocols={{ enableSsh: true } as never}
              onProtocolChange={() => {}}
              hosts={[]}
              credentials={[]}
            />
          ));
        },
      } as never,
      {
        manifest: {
          contributes: { panels: [{ id: "editor" }], hostEditorSections: [] },
        } as never,
      },
    );
    rendered.renderPanel("editor");
    const nav = await screen.findByRole("navigation");
    expect(nav.textContent).not.toContain("late.title");
    act(() => {
      dispose = app!.registerHostEditorSection({
        id: "late",
        group: "top",
        titleKey: "late.title",
        component: () => null,
      } as never);
    });
    expect(nav.textContent).toContain("late.title");
  });

  it("shows only sections marked simple in simple mode", async () => {
    let app: TermixApp | null = null;
    const rendered = await renderWithApp(
      {
        activate: (given: TermixApp) => {
          app = given;
          given.registerPanel("editor", () => (
            <HostEditor
              host={null}
              advanced={false}
              onBack={() => {}}
              onSave={() => {}}
              protocols={{ enableSsh: true } as never}
              onProtocolChange={() => {}}
              hosts={[]}
              credentials={[]}
            />
          ));
        },
      } as never,
      {
        manifest: {
          contributes: { panels: [{ id: "editor" }] },
        } as never,
      },
    );
    act(() => {
      const own = app!.registerHostEditorSection({
        id: "own",
        group: "ssh",
        titleKey: "own.title",
        component: () => null,
      } as never);
      const generated = app!.registerHostEditorSection({
        id: "rare",
        group: "top",
        titleKey: "gen.title",
        component: () => null,
      } as never);
      dispose = () => {
        own();
        generated();
      };
    });
    rendered.renderPanel("editor");
    const nav = await screen.findByRole("navigation");
    expect(nav.textContent).toContain("own.title");
    expect(nav.textContent).not.toContain("gen.title");
  });
});
