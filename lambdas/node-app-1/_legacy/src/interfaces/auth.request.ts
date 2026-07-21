import { Request } from "express"

export interface AuthRequest extends Request {
  idUsuario?: number | undefined
}