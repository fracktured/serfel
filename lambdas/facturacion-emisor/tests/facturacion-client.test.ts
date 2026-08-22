import { describe, it, expect, vi } from "vitest";
import { createFacturacionClient } from "../facturacion-client";

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe("facturacion-client", () => {
  it("login posts credentials and returns the token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ token: "JWT123" }));
    const c = createFacturacionClient(fetchFn, "https://api.test");
    const token = await c.login({ usuario: "U", rut: "1-9", clave: "P" });
    expect(token).toBe("JWT123");
    expect(fetchFn).toHaveBeenCalledWith("https://api.test/login", expect.objectContaining({ method: "POST" }));
  });

  it("procesar sends the base64 file with formato=1 and returns folio", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ Resultado: "OK", Folio: 501 }));
    const c = createFacturacionClient(fetchFn, "https://api.test");
    const r = await c.procesar("JWT123", "BASE64FILE");
    expect(r.ok).toBe(true);
    expect(r.folio).toBe(501);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("/wsds/procesar");
    expect(url).toContain("formato=1");
    expect(url).toContain("file=BASE64FILE");
  });
});
