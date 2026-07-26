import { NextFunction, Request, Response } from "express";
import { EntityNotFoundError, RequestError } from "../error/error";
import { logger } from "../config/winston";
import { ErrorResponse } from '../response/error.response';

export class ErrorHandler {

  public static globalHandler = async (err: Error, req: Request, res: Response, next: NextFunction): Promise<any> => {
    logger.error(err.message);
    
    const response = new ErrorResponse(new Date, 500, 'Internal server error', err.message, req.originalUrl);
  
    if ( err instanceof EntityNotFoundError ) {
      response.status = 404;
      response.error = 'Not found';
    } else if ( err instanceof RequestError ) {
      response.status = 400;
      response.error = 'Bad request';
    }
  
    return res.status(response.status).json(response);
  }
}