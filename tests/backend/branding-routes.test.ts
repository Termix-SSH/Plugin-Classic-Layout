import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import express, { type Router } from "express";
import { pngImage } from "./images";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockCtx } from "@termix-ssh/plugin-sdk/testing";
import type { PluginManifest } from "@termix-ssh/plugin-sdk/manifest";
import manifestJson from "../../manifest.json";
import { activate } from "../../src/backend/index";

const manifest = manifestJson as unknown as PluginManifest;

let dir: string;
let server: http.Server;
let base: string;
let provider: (() => Promise<unknown>) | undefined;
let pngDataUrl: string;

async function start(options: {
  permissions?: string[];
  coreSettings?: Record<string, string>;
}) {
  let router: Router | null = null;
  const mock = createMockCtx({
    sandbox: true,
    pluginId: manifest.id,
    manifest,
    capabilities: manifest.capabilities,
    router: () => (router = express.Router()),
    permissions: options.permissions ?? ["classic-layout.branding"],
    coreSettings: options.coreSettings,
    dataDir: dir,
  });
  await activate(mock.ctx);
  provider = (await mock.ctx.registry.consume(
    "classic-layout.brandingProvider",
  )) as (() => Promise<unknown>) | undefined;

  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.use((req, _res, next) => router!(req, _res, next));
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mock.setActor("admin-1");
}

async function request(method: string, body?: unknown) {
  const response = await fetch(`${base}/branding`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "classic-branding-"));
  const buffer = pngImage();
  pngDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("branding routes", () => {
  it("answers defaults when nothing is saved", async () => {
    await start({});
    const response = await request("GET");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      appName: "Termix",
      tagline: "",
      logo: null,
    });
  });

  it("refuses a user without the branding permission", async () => {
    await start({ permissions: [] });
    expect((await request("GET")).status).toBe(403);
    expect((await request("PATCH", { appName: "x" })).status).toBe(403);
  });

  it("saves, serves through the provider and survives a restart", async () => {
    await start({});
    const saved = await request("PATCH", {
      appName: "  Acme  ",
      tagline: "Ops",
      logo: pngDataUrl,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.appName).toBe("Acme");
    expect(saved.body.logo).toMatch(/^data:image\/png;base64,/);

    expect(await provider!()).toMatchObject({
      appName: "Acme",
      tagline: "Ops",
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await start({});
    expect((await request("GET")).body.appName).toBe("Acme");
  });

  it("removes the logo with null", async () => {
    await start({});
    await request("PATCH", { logo: pngDataUrl });
    const cleared = await request("PATCH", { logo: null });
    expect(cleared.body.logo).toBeNull();
  });

  it("rejects bad fields", async () => {
    await start({});
    expect((await request("PATCH", { appName: "x".repeat(61) })).status).toBe(
      400,
    );
    expect(
      (await request("PATCH", { logo: "data:image/svg+xml;base64,AAAA" }))
        .status,
    ).toBe(400);
    const unknown = await request("PATCH", { color: "red" });
    expect(unknown.status).toBe(400);
    expect(unknown.body.code).toBe("BRANDING_SETTINGS_UNKNOWN_FIELD");
    expect((await request("PATCH", [1])).status).toBe(400);
  });

  it("keeps the branding an older install set, once", async () => {
    await start({
      coreSettings: {
        branding_app_name: "Legacy Co",
        branding_tagline: "Since 2.8",
      },
    });
    expect((await request("GET")).body).toMatchObject({
      appName: "Legacy Co",
      tagline: "Since 2.8",
    });
    expect(fs.existsSync(path.join(dir, "branding.json"))).toBe(true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
    // The file wins over the old setting after the first run.
    await request("PATCH", { appName: "New" }).catch(() => undefined);
    await start({ coreSettings: { branding_app_name: "Legacy Co" } });
    expect((await request("GET")).body.appName).toBe("Legacy Co");
  });
});
