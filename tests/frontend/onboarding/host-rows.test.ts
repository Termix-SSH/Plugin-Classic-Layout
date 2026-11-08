import { describe, expect, it } from "vitest";
import {
  choiceSettings,
  currentChoice,
} from "../../../src/frontend/onboarding/HostRowsStep";

describe("host rows choice", () => {
  it("maps each choice to the saved settings", () => {
    expect(choiceSettings("buttons")).toEqual({
      hostTools: null,
      showPageButton: false,
    });
    expect(choiceSettings("both")).toEqual({
      hostTools: "page",
      showPageButton: true,
    });
    expect(choiceSettings("page")).toEqual({
      hostTools: "only",
      showPageButton: false,
    });
  });

  it("reads the choice back from the settings", () => {
    expect(currentChoice(undefined, {})).toBe("buttons");
    expect(currentChoice(null, { "host-page": false })).toBe("buttons");
    expect(currentChoice("page", {})).toBe("both");
    expect(currentChoice(undefined, { "host-page": true })).toBe("both");
    expect(currentChoice("only", { "host-page": true })).toBe("page");
  });

  it("round trips every choice", () => {
    for (const choice of ["buttons", "both", "page"] as const) {
      const saved = choiceSettings(choice);
      expect(
        currentChoice(saved.hostTools, { "host-page": saved.showPageButton }),
      ).toBe(choice);
    }
  });
});
