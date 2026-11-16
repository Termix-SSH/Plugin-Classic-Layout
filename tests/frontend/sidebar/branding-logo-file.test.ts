import { describe, expect, it } from "vitest";
import {
  BRANDING_LOGO_MAX_BYTES,
  brandingLogoDataUrl,
  isAcceptedBrandingLogoFile,
} from "../../../src/frontend/sidebar/branding-logo-file";

describe("branding logo file", () => {
  it("rejects types the file input accept attribute cannot enforce", () => {
    expect(
      isAcceptedBrandingLogoFile({ type: "image/svg+xml", size: 12 }),
    ).toBe(false);
    expect(isAcceptedBrandingLogoFile({ type: "text/plain", size: 12 })).toBe(
      false,
    );
    expect(isAcceptedBrandingLogoFile({ type: "image/png", size: 12 })).toBe(
      true,
    );
  });

  it("rejects oversized uploads before they are read into settings", () => {
    expect(
      isAcceptedBrandingLogoFile({
        type: "image/png",
        size: BRANDING_LOGO_MAX_BYTES + 1,
      }),
    ).toBe(false);
  });

  it("sends a PNG as it is", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", {
      type: "image/png",
    });
    expect(await brandingLogoDataUrl(file)).toBe(
      "data:image/png;base64,iVBORw==",
    );
  });

  it("gives up on other types when the image can't be drawn", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "logo.webp", {
      type: "image/webp",
    });
    expect(await brandingLogoDataUrl(file)).toBeNull();
  });
});
