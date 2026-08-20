import { describe, it, expect } from "vitest";
import { normalizeSearch, matchesAllTokens } from "./text-search";

describe("normalizeSearch", () => {
  it("lowercases, strips accents, collapses punctuation to spaces", () => {
    expect(normalizeSearch("YOG.BATIDO SOPR 165grs")).toBe("yog batido sopr 165grs");
    expect(normalizeSearch("Quéso Loncoleche")).toBe("queso loncoleche");
  });
});

describe("matchesAllTokens", () => {
  it("matches tokens in any order", () => {
    expect(matchesAllTokens("QUESO LONCO 200g", "lonco 200g queso")).toBe(true);
  });
  it("requires every token to be present", () => {
    expect(matchesAllTokens("QUESO LONCO", "queso nestle")).toBe(false);
  });
  it("single token behaves like substring match", () => {
    expect(matchesAllTokens("YOG.BATIDO", "batido")).toBe(true);
  });
  it("empty query matches everything", () => {
    expect(matchesAllTokens("anything", "")).toBe(true);
    expect(matchesAllTokens("anything", "   ")).toBe(true);
  });
});
