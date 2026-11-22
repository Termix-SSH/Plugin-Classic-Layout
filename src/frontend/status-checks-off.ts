import { useServerStatusMeta } from "@termix-ssh/plugin-sdk/ui";

/**
 * True when no plugin checks hosts (Host Status turned off), so no host will
 * ever leave "unknown". Termix 26.11.4 and newer say so; older ones never do.
 */
export function useStatusChecksOff(): boolean {
  const meta = useServerStatusMeta() as { statusChecksOff?: boolean };
  return meta.statusChecksOff === true;
}
