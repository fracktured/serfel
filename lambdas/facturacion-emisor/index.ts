import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DTE_NOTA_CREDITO_ELECTRONICA, type EmisorEvent, type EmisorResult } from "@serfel/shared";
import { createFacturacionClient, type Credenciales } from "./facturacion-client";

const sm = new SecretsManagerClient({});
const BASE_URL = process.env.FACT_BASE_URL ?? "https://www.facturacion.cl";
let credsByRut: Record<string, Credenciales> | null = null;

async function loadCreds(): Promise<Record<string, Credenciales>> {
  if (credsByRut) return credsByRut;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.FACT_SECRET_ARN }));
  if (!secret.SecretString) throw new Error("FACT secret has no SecretString");
  credsByRut = JSON.parse(secret.SecretString) as Record<string, Credenciales>;
  return credsByRut;
}

export async function handler(event: EmisorEvent): Promise<EmisorResult> {
  try {
    const creds = (await loadCreds())[event.rutEmpresa];
    if (!creds) return { ok: false, error: `Sin credenciales para rut ${event.rutEmpresa}` };
    const client = createFacturacionClient(fetch, BASE_URL);
    const token = await client.login(creds);

    if (event.op === "procesar") {
      const r = await client.procesar(token, event.flatFileBase64);
      if (!r.ok || r.folio === undefined) return { ok: false, resultado: r.resultado, error: r.error };
      const [orig, ced] = await Promise.all([
        client.obtenerLink(token, { folio: r.folio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: false }),
        client.obtenerLink(token, { folio: r.folio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: true }),
      ]);
      return { ok: true, folio: r.folio, urlPdfOriginal: orig, urlPdfCedible: ced, resultado: r.resultado };
    }

    const url = await client.obtenerLink(token, { folio: event.folio, tipoDte: event.tipoDte, cedible: event.cedible });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
