import { UsuarioRepo } from "../config/bd.sequelize";
import { Usuario } from "../model/usuario.model";

export class UsuarioService {

  public static authenticate = async (username: string, password:string): Promise<Usuario> => {
    if ( username.indexOf('-') == -1 ) throw new Error('Credenciales inválidas');
  
    const [ rut, dv ] = username.split('-');
    const usuario = await UsuarioRepo.findOne({
      where: {
        rutUsuario: rut,
        dvUsuario: dv,
        password: password
      },
    });
    
    if ( !usuario ) throw Error('Credenciales inválidas');
    return usuario;
  }

}