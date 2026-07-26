import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from "helmet";
import cors from "cors";
import { AuthHandler } from './middleware/auth.handler';
import { ErrorHandler } from './middleware/error.handler';
import { RutaRoutes } from './routes/ruta.routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
  }

  private config(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(AuthHandler.basicAuth);
    this.app.use("/routes/", RutaRoutes.getRouter());

    this.app.use(function(req: Request, res: Response) {
      res.status(404).send({url: req.originalUrl + ' no existe'})
    });

    this.app.use(ErrorHandler.globalHandler);
  }
}

export default new App().app;