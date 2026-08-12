import { describe, it, expect } from "vitest";
import { StockInputSchema } from "./productos";

describe("StockInputSchema", () => {
  it("accepts a nonnegative quantity with up to 3 decimals", () => {
    expect(StockInputSchema.safeParse({ cantidad: 12.5 }).success).toBe(true);
    expect(StockInputSchema.safeParse({ cantidad: 0 }).success).toBe(true);
    expect(StockInputSchema.safeParse({ cantidad: 3.125 }).success).toBe(true);
  });
  it("rejects negatives, non-numbers and >3 decimals", () => {
    expect(StockInputSchema.safeParse({ cantidad: -1 }).success).toBe(false);
    expect(StockInputSchema.safeParse({ cantidad: "5" }).success).toBe(false);
    expect(StockInputSchema.safeParse({ cantidad: 1.2345 }).success).toBe(false);
    expect(StockInputSchema.safeParse({}).success).toBe(false);
  });
});
