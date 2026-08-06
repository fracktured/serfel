import { describe, it, expect } from "vitest";
import { stripCoproadPrefix } from "./tenant";

describe("stripCoproadPrefix", () => {
  it("strips the prefix from a nested path", () => {
    expect(stripCoproadPrefix("/coproad/sales/")).toBe("/sales/");
    expect(stripCoproadPrefix("/coproad/orders/123")).toBe("/orders/123");
  });
  it("maps the bare prefix to root", () => {
    expect(stripCoproadPrefix("/coproad")).toBe("/");
    expect(stripCoproadPrefix("/coproad/")).toBe("/");
  });
  it("leaves non-coproad paths unchanged", () => {
    expect(stripCoproadPrefix("/sales/")).toBe("/sales/");
    expect(stripCoproadPrefix("/")).toBe("/");
  });
  it("does not strip a partial segment match", () => {
    expect(stripCoproadPrefix("/coproadX/y")).toBe("/coproadX/y");
  });
});
