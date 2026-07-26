import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};

/** One row of the grouped cargo-list detail query (pre-assembly). */
export interface DetailRow {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomUm: string;
  nomTipoProducto: string;
  sumCantidad: string; // DECIMAL(18,3) sum, as returned by mysql2
  subtotal: string; // DECIMAL sum, as returned by mysql2
}

export interface CargoListRow {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomUm: string;
  nomTipoProducto: string;
  sumCantidad: string; // truncated to 2 decimals (legacy quirk)
  subtotal: number;
  obs: number[]; // porcion numeros, [] when none
}

export interface CargoListData {
  nomRutas: string; // "Ruta Norte, Ruta Sur"
  rows: CargoListRow[]; // ordered by tipo_producto, then nom_producto
  totals: { numFacturas: number; total: number };
}
