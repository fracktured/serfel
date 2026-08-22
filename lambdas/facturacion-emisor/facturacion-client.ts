export interface Credenciales { usuario: string; rut: string; clave: string; }
export interface ProcesarResult { ok: boolean; folio?: number; resultado?: string; error?: string; }

type FetchFn = typeof fetch;

export function createFacturacionClient(fetchFn: FetchFn, baseUrl: string) {
  async function login(creds: Credenciales): Promise<string> {
    const res = await fetchFn(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuario: creds.usuario, rut: creds.rut, clave: creds.clave }),
    });
    if (!res.ok) throw new Error(`login failed: ${res.status}`);
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new Error("login returned no token");
    return body.token;
  }

  async function procesar(token: string, fileB64: string): Promise<ProcesarResult> {
    const qs = new URLSearchParams({ file: fileB64, formato: "1", incluyelink: "1" });
    const res = await fetchFn(`${baseUrl}/wsds/procesar?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: token },
    });
    if (!res.ok) return { ok: false, error: `procesar HTTP ${res.status}` };
    const body = (await res.json()) as { Resultado?: string; Folio?: number; Error?: string };
    const ok = (body.Resultado ?? "").toUpperCase() === "OK";
    return { ok, folio: body.Folio, resultado: body.Resultado, error: ok ? undefined : (body.Error ?? body.Resultado) };
  }

  async function obtenerLink(
    token: string,
    args: { folio: number; tipoDte: number; cedible: boolean },
  ): Promise<string> {
    const qs = new URLSearchParams({
      tpomov: "V",
      folio: String(args.folio),
      tipo: String(args.tipoDte),
      cedible: args.cedible ? "True" : "False",
    });
    const res = await fetchFn(`${baseUrl}/wsds/obtenerlink?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: token },
    });
    if (!res.ok) throw new Error(`obtenerlink HTTP ${res.status}`);
    const body = (await res.json()) as { Mensaje?: string; url?: string };
    return body.url ?? body.Mensaje ?? "";
  }

  return { login, procesar, obtenerLink };
}
