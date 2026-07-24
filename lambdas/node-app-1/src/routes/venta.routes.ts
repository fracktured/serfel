import express, { Response, NextFunction, Router } from 'express';
import { AuthRequest } from "../interfaces/auth.request";
import { VentaService } from '../services/venta.service';
import { PrefacturaReq } from '../request/prefactura.request';
import { logger } from '../config/winston';

export class VentaRoutes {

   public static getRouter(): Router {
      const router = express.Router();

      /**
       * Todas las rutas
       */
      router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
         //const idProducto: number = parseInt(req.params.idProducto, 10);
         //newPorcion.idUsuario = req.idUsuario!;

         VentaService.findAll()
            .then(function (data) {
               res.status(200).send(data);
            })
            .catch(next);
      });

      router.post("/preinvoice", async (req: AuthRequest, res: Response, next: NextFunction) => {
         const prefactura: PrefacturaReq = req.body;
         const idUsuario = req.idUsuario!;
         logger.info('Prefacturar', { 
            prefactura: prefactura,
            idUsuario 
         });

         VentaService.prefacturar(prefactura, idUsuario)
            .then(function (data) {
               res.status(200).send(data);
            })
            .catch(next);
      });

      return router;
   }
}