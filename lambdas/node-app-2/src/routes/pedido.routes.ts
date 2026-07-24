import express, { Response, NextFunction, Router } from 'express';
import { AuthRequest } from "../interfaces/auth.request";
import { PedidoService } from '../services/pedido.service';

export class PedidoRoutes {

   public static getRouter(): Router {
      const router = express.Router();

      /**
       * Todas las rutas
       */
      router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
         const idProducto: number = parseInt(req.params.idProducto, 10);
         //newPorcion.idUsuario = req.idUsuario!;

         PedidoService.findAll()
            .then(function (data) {
               res.status(200).send(data);
            })
            .catch(next);
      });

      return router;
   }
}