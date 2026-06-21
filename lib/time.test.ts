import { describe, expect, it } from "vitest";
import { mytLocalToIso } from "./time";

describe("mytLocalToIso", () => {
  it("treats a datetime-local value as Malaysia time (UTC+8)", () => {
    // 12 Jun 04:44 MYT == 11 Jun 20:44 UTC
    expect(mytLocalToIso("2026-06-12T04:44")).toBe("2026-06-11T20:44:00.000Z");
  });

  it("treats a date-only value as midnight Malaysia time", () => {
    // Midnight 12 Jun MYT == 11 Jun 16:00 UTC
    expect(mytLocalToIso("2026-06-12")).toBe("2026-06-11T16:00:00.000Z");
  });

  it("handles noon correctly", () => {
    // 12:00 MYT == 04:00 UTC
    expect(mytLocalToIso("2026-06-12T12:00")).toBe("2026-06-12T04:00:00.000Z");
  });

  it("falls back to a valid ISO string for empty input", () => {
    expect(() => new Date(mytLocalToIso("")).toISOString()).not.toThrow();
  });
});
