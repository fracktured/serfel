import type { Context } from "hono";
import type { Db } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/shared";

export interface AppDeps {
  getDb: () => Promise<Db>;
  getIdUsuario: (c: Context) => number | null;
  invokeEmisor: (event: EmisorEvent) => Promise<EmisorResult>;
}

export type AppEnv = { Variables: { idUsuario: number; idTipoUsuario: number } };
