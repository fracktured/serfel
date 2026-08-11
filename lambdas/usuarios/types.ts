import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
  /** Set of id_usuario values that already have a Cognito user. */
  listEnrolledIds: () => Promise<Set<number>>;
  /** Creates a Cognito user (AdminCreateUser + email invite). */
  enrollCognito: (email: string, idUsuario: number) => Promise<void>;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
