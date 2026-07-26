import express, { Response, NextFunction, Router } from 'express';
import { AuthRequest } from "../interfaces/auth.request";
import { Ruta } from '../model/ruta.model';
import { ListadoCargaService } from '../services/listado.carga.service';
import { RutaService } from '../services/ruta.service';

export class RutaRoutes {

  public static getRouter(): Router {
    const router = express.Router();
    
    /**
     * Todas las rutas
     */
    router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
      const idProducto: number = parseInt(req.params.idProducto, 10);
      //newPorcion.idUsuario = req.idUsuario!;
      
      RutaService.findAll()
        .then(function(data) {
          res.status(200).send(data);
        })
        .catch(next);
    });

    router.post("/cargoList", async (req: AuthRequest, res: Response, next: NextFunction) => {
      const rutas: Ruta[] = req.body;

      const pdfService = new ListadoCargaService();
      res.type('pdf');  
        
      pdfService.createPdf(rutas)
        .then(function(doc) {
          doc.pipe(res);
          doc.end();
        })
        .catch(next);
    });

    return router;
  }
}