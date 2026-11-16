import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import express, { type Router } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockCtx } from "@termix-ssh/plugin-sdk/testing";
import type { PluginManifest } from "@termix-ssh/plugin-sdk/manifest";
import manifestJson from "../../manifest.json";
import { activate } from "../../src/backend/index";
import {
  parseDefaults,
  parseTemplate,
} from "../../src/backend/interface-defaults";

const manifest = manifestJson as unknown as PluginManifest;

let dir: string;
let server: http.Server | undefined;
let base: string;

async function start(permissions: string[]) {
  let router: Router | null = null;
  const mock = createMockCtx({
    sandbox: true,
    pluginId: manifest.id,
    manifest,
    capabilities: manifest.capabilities,
    router: () => (router = express.Router()),
    permissions,
    dataDir: dir,
  });
  await activate(mock.ctx);
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => router!(req, res, next));
  server = http.createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mock.setActor("user-1");
}

async function stop() {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
}

async function request(method: string, body?: unknown) {
  const response = await fetch(`${base}/interface-defaults`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

const template = { preset: "simple", pins: ["snippets"], locked: true };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "classic-defaults-"));
});

afterEach(async () => {
  await stop();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("interface defaults routes", () => {
  it("lets any signed in user read them, empty at first", async () => {
    await start([]);
    const response = await request("GET");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ everyone: null, roles: {} });
  });

  it("refuses a save without the permission", async () => {
    await start([]);
    const response = await request("PUT", { everyone: template, roles: {} });
    expect(response.status).toBe(403);
  });

  it("saves and keeps them across a restart", async () => {
    await start(["classic-layout.interface-defaults"]);
    const saved = await request("PUT", {
      everyone: template,
      roles: { operator: { preset: "advanced", pins: [], locked: false } },
    });
    expect(saved.status).toBe(200);
    await stop();
    await start([]);
    expect((await request("GET")).body).toEqual({
      everyone: template,
      roles: { operator: { preset: "advanced", pins: [], locked: false } },
    });
  });

  it("refuses a malformed body", async () => {
    await start(["classic-layout.interface-defaults"]);
    const response = await request("PUT", {
      everyone: { preset: "huge", pins: [], locked: false },
    });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INTERFACE_DEFAULTS_INVALID");
  });

  it("still guards branding with its own permission", async () => {
    await start(["classic-layout.interface-defaults"]);
    const response = await fetch(`${base}/branding`);
    expect(response.status).toBe(403);
  });
});

describe("parsing interface defaults", () => {
  it("drops duplicate pins", () => {
    expect(
      parseTemplate({ preset: "balanced", pins: ["a", "a"], locked: false }),
    ).toEqual({ preset: "balanced", pins: ["a"], locked: false });
  });

  it("refuses bad presets, pins and locks", () => {
    expect(parseTemplate({ preset: "x", pins: [], locked: false })).toBeNull();
    expect(
      parseTemplate({ preset: "simple", pins: ["no spaces"], locked: false }),
    ).toBeNull();
    expect(parseTemplate({ preset: "simple", pins: [], locked: "yes" })).toBe(
      null,
    );
    expect(
      parseTemplate({
        preset: "simple",
        pins: Array.from({ length: 101 }, (_, i) => `a${i}`),
        locked: false,
      }),
    ).toBeNull();
  });

  it("refuses a bad role name or a bad role template", () => {
    expect(parseDefaults({ roles: { "bad role": template } })).toBeNull();
    expect(parseDefaults({ roles: { ok: { preset: "x" } } })).toBeNull();
    expect(parseDefaults([])).toBeNull();
  });

  it("treats a missing everyone as none", () => {
    expect(parseDefaults({ roles: {} })).toEqual({ everyone: null, roles: {} });
  });
});
