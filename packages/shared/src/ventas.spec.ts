import { describe, it, expect } from "vitest";
import { PrefacturaBatchInputSchema } from "./ventas";

describe("PrefacturaBatchInputSchema", () => {
  it("accepts a valid batch", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [1, 2, 3] });
    expect(r.success).toBe(true);
  });
  it("rejects an empty idPedidos array", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [] });
    expect(r.success).toBe(false);
  });
  it("rejects duplicate idPedidos", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [1, 1] });
    expect(r.success).toBe(false);
  });
  it("rejects non-positive ids", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [0] });
    expect(r.success).toBe(false);
  });
  it("rejects a non-positive rutEmpresa", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 0, idPedidos: [1] });
    expect(r.success).toBe(false);
  });
});
