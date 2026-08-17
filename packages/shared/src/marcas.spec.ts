import { describe, it, expect } from "vitest";
import { MarcaInputSchema } from "./marcas";

describe("MarcaInputSchema", () => {
  it("accepts a valid marca and defaults descMarca to empty", () => {
    const parsed = MarcaInputSchema.parse({ nomMarca: "  SOPROLE  " });
    expect(parsed).toEqual({ nomMarca: "SOPROLE", descMarca: "" });
  });

  it("rejects an empty nomMarca", () => {
    expect(MarcaInputSchema.safeParse({ nomMarca: "" }).success).toBe(false);
  });

  it("rejects nomMarca over 50 chars", () => {
    expect(MarcaInputSchema.safeParse({ nomMarca: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects descMarca over 200 chars", () => {
    expect(
      MarcaInputSchema.safeParse({ nomMarca: "OK", descMarca: "x".repeat(201) }).success
    ).toBe(false);
  });
});
