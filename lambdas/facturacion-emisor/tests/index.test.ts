import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-secrets-manager", () => {
  class SecretsManagerClient {
    send = sendMock;
  }
  class GetSecretValueCommand {
    constructor(public input: unknown) {}
  }
  return { SecretsManagerClient, GetSecretValueCommand };
});

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe("facturacion-emisor handler", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    sendMock.mockResolvedValue({
      SecretString: JSON.stringify({
        "1-9": { usuario: "U", rut: "1-9", clave: "P" },
      }),
    });
  });

  it("procesar: procesar succeeds with a folio but a subsequent obtenerlink fails -> still ok:true with the folio (no duplicate-emission retry)", async () => {
    const fetchMock = vi
      .fn()
      // login
      .mockResolvedValueOnce(jsonResponse({ token: "JWT123" }))
      // procesar -> OK + folio
      .mockResolvedValueOnce(jsonResponse({ Resultado: "OK", Folio: 501 }))
      // obtenerlink (original) fails
      .mockRejectedValueOnce(new Error("network blip"))
      // obtenerlink (cedible) fails too
      .mockRejectedValueOnce(new Error("network blip"));
    vi.stubGlobal("fetch", fetchMock);

    const { handler } = await import("../index");
    const result = await handler({
      op: "procesar",
      rutEmpresa: "1-9",
      flatFileBase64: "BASE64FILE",
    });

    expect(result.ok).toBe(true);
    expect(result.folio).toBe(501);
    expect(result.urlPdfOriginal).toBe("");
    expect(result.urlPdfCedible).toBe("");

    vi.unstubAllGlobals();
  });

  it("procesar: procesar itself fails -> ok:false, no folio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: "JWT123" }))
      .mockResolvedValueOnce(jsonResponse({ Resultado: "ERROR", Error: "rechazado" }));
    vi.stubGlobal("fetch", fetchMock);

    const { handler } = await import("../index");
    const result = await handler({
      op: "procesar",
      rutEmpresa: "1-9",
      flatFileBase64: "BASE64FILE",
    });

    expect(result.ok).toBe(false);
    expect(result.folio).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
