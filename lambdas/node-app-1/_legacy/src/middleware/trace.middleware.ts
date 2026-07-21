import { Request, Response, NextFunction } from 'express';
import { traceContext } from '../config/trace.context';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const context = traceContext.createContext();

  // Ejecutar la siguiente función dentro del contexto de trazabilidad
  traceContext.run(context, () => {
    next();
  });
};

export default traceMiddleware;
