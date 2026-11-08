import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { deployKeyCommand } from "../../../../src/frontend/sidebar/credential-tree/deploy-command";

describe("deployKeyCommand", () => {
  it("quotes the key so its comment can't run commands", () => {
    const key = "ssh-ed25519 AAAA $(touch pwned) `id` it's";
    const command = deployKeyCommand(key);
    expect(command).toContain(
      `echo 'ssh-ed25519 AAAA $(touch pwned) \`id\` it'\\''s'`,
    );
    expect(command).not.toContain('"');
  });

  it("echoes the key back unchanged in a real shell", () => {
    const key = "ssh-rsa AAAA $(whoami) it's";
    const quoted = deployKeyCommand(key).match(/echo (.*) >>/)![1];
    let out: string;
    try {
      out = execFileSync("sh", ["-c", `printf %s ${quoted}`]).toString();
    } catch {
      return;
    }
    expect(out).toBe(key);
  });
});
