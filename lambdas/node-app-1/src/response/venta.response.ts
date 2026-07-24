import { Venta } from "../model/venta.model";

export class PrefacturaResp {
  constructor (
    public venta: Venta,
    public messages: string[]
  ) { }
}