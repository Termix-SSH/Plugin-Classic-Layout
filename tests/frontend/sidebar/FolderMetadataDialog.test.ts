import { describe, expect, it } from "vitest";
import { folderSuggestions } from "../../../src/frontend/sidebar/FolderMetadataDialog";

const paths = [
  "Folder 1",
  "Folder 1 / Folder 2",
  "Folder 1 / Folder 3",
  "Lab / Folder 9",
];

describe("folderSuggestions", () => {
  it("lists folders that start with what is typed, then ones that contain it", () => {
    expect(folderSuggestions("folder 1 / fol", paths)).toEqual([
      "Folder 1 / Folder 2",
      "Folder 1 / Folder 3",
    ]);
    expect(folderSuggestions("Fol", paths)).toEqual([
      "Folder 1",
      "Folder 1 / Folder 2",
      "Folder 1 / Folder 3",
      "Lab / Folder 9",
    ]);
  });

  it("reads loose slashes the way a saved path is written", () => {
    expect(folderSuggestions("Folder 1/Folder", paths)).toEqual([
      "Folder 1 / Folder 2",
      "Folder 1 / Folder 3",
    ]);
  });

  it("leaves out a path typed in full and suggests nothing for an empty name", () => {
    expect(folderSuggestions("Folder 1 / Folder 3 /", paths)).toEqual([]);
    expect(folderSuggestions("  ", paths)).toEqual([]);
  });

  it("shows at most six", () => {
    const many = Array.from({ length: 10 }, (_, i) => `Team / ${i}`);
    expect(folderSuggestions("Team", many)).toHaveLength(6);
  });
});
