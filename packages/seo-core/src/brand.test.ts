import { describe, expect, it } from "vitest";
import { BrandValidationError, toAbsoluteUrl, toIsoDateTime, toSlug } from "./brand.js";

describe("toSlug", () => {
  it("accepts a well-formed slug", () => {
    expect(toSlug("washing-machine-care")).toBe("washing-machine-care");
  });

  it.each([
    ["Washing_Machine", "uppercase and underscore"],
    ["Washing-Machine", "uppercase"],
    ["-lead", "leading hyphen"],
    ["trail-", "trailing hyphen"],
    ["a--b", "double hyphen"],
    ["", "empty string"],
    ["has space", "whitespace"],
  ])("rejects %s (%s)", (value) => {
    expect(() => toSlug(value)).toThrow(BrandValidationError);
  });

  it("names the offending value in the error message", () => {
    expect(() => toSlug("Bad_Slug")).toThrow(/Bad_Slug/);
  });
});

describe("toAbsoluteUrl", () => {
  it("accepts an absolute https URL", () => {
    expect(toAbsoluteUrl("https://everyware.in/blog/x")).toBe("https://everyware.in/blog/x");
  });

  it("accepts the site root with its trailing slash", () => {
    expect(toAbsoluteUrl("https://everyware.in/")).toBe("https://everyware.in/");
  });

  it.each([
    ["http://everyware.in/blog/x", "not https"],
    ["/blog/x", "relative"],
    ["https://everyware.in/blog/x/", "trailing slash"],
    ["https://everyware.in/blog/x#section", "fragment"],
    ["https://everyware.in/blog?page=2", "query string"],
    ["", "empty string"],
  ])("rejects %s (%s)", (value) => {
    expect(() => toAbsoluteUrl(value)).toThrow(BrandValidationError);
  });

  it("names the offending value in the error message", () => {
    expect(() => toAbsoluteUrl("http://everyware.in/x")).toThrow(/http:\/\/everyware\.in\/x/);
  });
});

describe("toIsoDateTime", () => {
  it("accepts a Date", () => {
    expect(toIsoDateTime(new Date("2026-09-04T10:30:00.000Z"))).toBe("2026-09-04T10:30:00.000Z");
  });

  it("accepts an ISO string with a Z offset", () => {
    expect(toIsoDateTime("2026-09-04T10:30:00.000Z")).toBe("2026-09-04T10:30:00.000Z");
  });

  it("accepts an ISO string with a numeric offset", () => {
    expect(toIsoDateTime("2026-09-04T16:00:00+05:30")).toBe("2026-09-04T16:00:00+05:30");
  });

  it.each([
    ["2026-09-04", "date only, no time or offset"],
    ["2026-09-04T10:30:00", "no offset"],
    ["", "empty string"],
    ["not a date", "unparseable"],
    ["2026-13-45T10:30:00Z", "not a real point in time"],
  ])("rejects %s (%s)", (value) => {
    expect(() => toIsoDateTime(value)).toThrow(BrandValidationError);
  });

  it("rejects an Invalid Date", () => {
    expect(() => toIsoDateTime(new Date("nonsense"))).toThrow(BrandValidationError);
  });

  it("names the offending value in the error message", () => {
    expect(() => toIsoDateTime("2026-09-04")).toThrow(/2026-09-04/);
  });
});
