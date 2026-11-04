import { useSyncExternalStore } from "react";
import { invokeAction } from "@termix-ssh/plugin-sdk/frontend";

/**
 * Which host actions the user put in or took out of the row's connect bar.
 * The hosts panel owns the preference and mirrors it here, so every row can
 * read and change it without its own fetch.
 */
let current: Record<string, boolean> = {};
let changer: ((id: string, shown: boolean) => void) | null = null;
const listeners = new Set<() => void>();

export function setBarActions(next: Record<string, boolean>): void {
  const same =
    Object.keys(next).length === Object.keys(current).length &&
    Object.entries(next).every(([id, value]) => current[id] === value);
  if (same) return;
  current = next;
  for (const listener of listeners) listener();
}

/** The hosts panel hands in how to save a change. */
export function setBarActionChanger(
  next: ((id: string, shown: boolean) => void) | null,
): void {
  changer = next;
}

/** Shows or hides one action on every host row. */
export function changeBarAction(id: string, shown: boolean): void {
  changer?.(id, shown);
}

export function canChangeBarActions(): boolean {
  return changer !== null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBarActions(): Record<string, boolean> {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

/** The tab type of a host page, when a plugin offers one. */
export const HOST_PAGE_TAB = "host";

/** Action a host page plugin registers to open its page at one tool. */
export const HOST_PAGE_OPEN_ACTION = "host-page.open";

/**
 * Where a host tool opens: its own tab, inside the host page, or only through
 * the host page (no connect buttons on the row, a click opens the page).
 */
export type HostToolsMode = "tab" | "page" | "only";

export function hostToolsMode(value: unknown): HostToolsMode {
  return value === "page" || value === "only" ? value : "tab";
}

/** Whether an action shows in the bar: the user's choice, else its own. */
export function showsInBar(
  barActions: Record<string, boolean>,
  action: { id: string; tray?: boolean },
): boolean {
  const chosen = barActions[action.id];
  if (chosen !== undefined) return chosen;
  return action.tray !== false;
}

/** A tool that can open as a section of the host page. */
export function opensInHostPage(action: {
  kind?: string;
  tabType?: string;
  run?: unknown;
}): boolean {
  return (
    action.kind === "open" &&
    !action.run &&
    !!action.tabType &&
    action.tabType !== HOST_PAGE_TAB
  );
}

/**
 * Asks the host page plugin to show `section` on the host's page, reusing an
 * open page. False when no plugin answered, so the caller opens a tab instead.
 */
export async function openInHostPage(
  host: unknown,
  section: string,
): Promise<boolean> {
  try {
    return (await invokeAction(HOST_PAGE_OPEN_ACTION, host, section)) === true;
  } catch {
    return false;
  }
}
