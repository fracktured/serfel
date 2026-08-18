import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
