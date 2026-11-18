import { beforeAll, describe, expect, it } from "vitest";
import {
  BRANDING_DEFAULT_APP_NAME,
  BRANDING_LOGO_MAX_BYTES,
  parseBrandingAppName,
  parseBrandingLogoDataUrl,
  parseBrandingTagline,
} from "../../src/backend/branding";
import { jpegImage, pngClaiming, pngImage, pngWithText } from "./images";

async function toDataUrl(
  buffer: Buffer,
  mime: "image/png" | "image/jpeg" | "image/webp",
): Promise<string> {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

let pngBuffer: Buffer;
let jpegBuffer: Buffer;
let webpBuffer: Buffer;
let oversizedPngBuffer: Buffer;

beforeAll(() => {
  pngBuffer = pngImage();
  jpegBuffer = jpegImage();
  // Only the RIFF header: WebP is turned away before decoding.
  webpBuffer = Buffer.from("52494646240000005745425056503820", "hex");
  oversizedPngBuffer = pngImage(600, 600, true);
});

describe("parseBrandingAppName", () => {
  it("trims and accepts a normal name", () => {
    expect(parseBrandingAppName("  My Company  ")).toBe("My Company");
  });

  it("falls back to the default when cleared", () => {
    expect(parseBrandingAppName("")).toBe(BRANDING_DEFAULT_APP_NAME);
    expect(parseBrandingAppName("   ")).toBe(BRANDING_DEFAULT_APP_NAME);
  });

  it("rejects names over 60 characters", () => {
    expect(parseBrandingAppName("x".repeat(61))).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(parseBrandingAppName(42)).toBeNull();
    expect(parseBrandingAppName(null)).toBeNull();
  });
});

describe("parseBrandingTagline", () => {
  it("trims and accepts a normal tagline", () => {
    expect(parseBrandingTagline("  Ship faster  ")).toBe("Ship faster");
  });

  it("accepts an empty tagline (means: use the default)", () => {
    expect(parseBrandingTagline("")).toBe("");
    expect(parseBrandingTagline("   ")).toBe("");
  });

  it("rejects taglines over 160 characters", () => {
    expect(parseBrandingTagline("x".repeat(161))).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(parseBrandingTagline(42)).toBeNull();
  });
});

describe("parseBrandingLogoDataUrl", () => {
  it("accepts a PNG data URL and re-encodes it to PNG", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(pngBuffer, "image/png"),
    );
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/png;base64,")).toBe(true);
    const decoded = Buffer.from(result!.split(",")[1]!, "base64");
    expect(decoded.subarray(1, 4).toString()).toBe("PNG");
  });

  it("accepts a JPEG data URL and normalizes it to PNG", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(jpegBuffer, "image/jpeg"),
    );
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("turns a WebP data URL away, the settings page sends those as PNG", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(webpBuffer, "image/webp"),
    );
    expect(result).toBeNull();
  });

  it("drops text chunks, so no metadata is kept", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(pngWithText("secret-note"), "image/png"),
    );
    expect(result).not.toBeNull();
    const decoded = Buffer.from(result!.split(",")[1]!, "base64");
    expect(decoded.includes("secret-note")).toBe(false);
    expect(decoded.includes("tEXt")).toBe(false);
  });

  it("refuses a PNG that claims more pixels than the cap before decoding", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(pngClaiming(5000, 5000), "image/png"),
    );
    expect(result).toBeNull();
  });

  it("refuses JPEG bytes sent as a PNG", async () => {
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(jpegBuffer, "image/png"),
    );
    expect(result).toBeNull();
  });

  it("rejects a non-image/SVG mime prefix outright", async () => {
    const svg = Buffer.from('<svg onload="alert(1)"></svg>', "utf8").toString(
      "base64",
    );
    const result = await parseBrandingLogoDataUrl(
      `data:image/svg+xml;base64,${svg}`,
    );
    expect(result).toBeNull();
  });

  it("rejects a value that isn't a data URL at all", async () => {
    expect(await parseBrandingLogoDataUrl("not-a-data-url")).toBeNull();
    expect(await parseBrandingLogoDataUrl(undefined)).toBeNull();
  });

  it("rejects a spoofed data URL whose bytes aren't a real image", async () => {
    const fake = Buffer.from("definitely not an image").toString("base64");
    const result = await parseBrandingLogoDataUrl(
      `data:image/png;base64,${fake}`,
    );
    expect(result).toBeNull();
  });

  it("rejects an image that normalizes over the size cap", async () => {
    // Sanity check the fixture is actually large enough to exceed the cap.
    expect(oversizedPngBuffer.length).toBeGreaterThan(BRANDING_LOGO_MAX_BYTES);
    const result = await parseBrandingLogoDataUrl(
      await toDataUrl(oversizedPngBuffer, "image/png"),
    );
    expect(result).toBeNull();
  });
});
