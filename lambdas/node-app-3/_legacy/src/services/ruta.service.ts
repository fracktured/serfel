import { Ruta } from "../model/ruta.model"
import { ESTADO_ACTIVO } from '../model/estado.model';
import { RutaRepo } from "../config/bd.sequelize";

export class RutaService {

  public static findAll = async (): Promise<Ruta[]> => {
    return await RutaRepo.findAll({
      where: {
        idEstado: ESTADO_ACTIVO
      }
    });
  }
  
}