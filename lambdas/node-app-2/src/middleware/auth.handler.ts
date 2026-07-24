import { NextFunction, Response } from "express";
import { AuthRequest } from "../interfaces/auth.request";
import { ErrorResponse } from "../response/error.response";
import { UsuarioService } from "../services/usuario.service";

export class AuthHandler {

  public static basicAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    // make authenticate path public
    //if (req.path === '/users/authenticate') {
    //    return next();
    //}

    // check for basic auth header
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        const response = new ErrorResponse(new Date, 401, 'Unauthorized', 'Falta header de autorización', req.originalUrl);
        return res.status(401).json(response);
    }

    // verify auth credentials
    const base64Credentials =  req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    //logger.info(`Autorizacion para ${username} ${password}`);
    UsuarioService.authenticate(username, password)
      .then(function(user) {
        req.idUsuario = user.idUsuario;
        next();
      })
      .catch((err) => {
        const response = new ErrorResponse(new Date, 401, 'Unauthorized', err.message, req.originalUrl);
        return res.status(response.status).json(response);
      });
  }
}