import { describe, expect, it } from "vitest";
import { stem } from "./tokenize.js";

describe("stem", () => {
  it.each([
    ["machines", "machine"],
    ["appliances", "appliance"],
    ["boxes", "box"],
    ["dishes", "dish"],
    ["washes", "wash"],
    ["batteries", "battery"],
    ["washing", "wash"],
    ["serviced", "servic"],
    ["filters", "filter"],
  ])("stems %s to %s", (word, expected) => {
    expect(stem(word)).toBe(expected);
  });

  it("leaves short words alone", () => {
    for (const word of ["ac", "gas", "is"]) {
      expect(stem(word)).toBe(word);
    }
  });

  it("maps a plural and its singular to the same stem", () => {
    for (const [plural, singular] of [
      ["machines", "machine"],
      ["filters", "filter"],
      ["coils", "coil"],
    ]) {
      expect(stem(plural ?? "")).toBe(stem(singular ?? ""));
    }
  });
});
