import { describe, it, expect } from "vitest";
import { computeDv, parseRut, rutValido, formatRut } from "./usuarios";

describe("computeDv", () => {
  it("computes check digits including K and 0", () => {
    expect(computeDv(11111111)).toBe("1");
    expect(computeDv(6371526)).toBe("K");
    expect(computeDv(12345678)).toBe("5");
    expect(computeDv(11704324)).toBe("0");
  });
});

describe("parseRut", () => {
  it("parses dotted and plain formats", () => {
    expect(parseRut("12.345.678-5")).toEqual({ rut: 12345678, dv: "5" });
    expect(parseRut("12345678-5")).toEqual({ rut: 12345678, dv: "5" });
    expect(parseRut("6371526-k")).toEqual({ rut: 6371526, dv: "K" });
  });
  it("rejects malformed input", () => {
    expect(parseRut("abc")).toBeNull();
    expect(parseRut("")).toBeNull();
    expect(parseRut("12345678-")).toBeNull();
  });
});

describe("rutValido", () => {
  it("accepts valid ruts and rejects bad check digits", () => {
    expect(rutValido("12.345.678-5")).toBe(true);
    expect(rutValido("6371526-K")).toBe(true);
    expect(rutValido("12345678-9")).toBe(false);
  });
});

describe("formatRut", () => {
  it("joins rut and dv", () => {
    expect(formatRut(12345678, "5")).toBe("12345678-5");
  });
});
