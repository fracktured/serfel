export class UsuarioModel {

   constructor(
      public idUsuario: number,
      public rutUsuario: number,
      public dvUsuario: string,
      public nomUsuario: string,
      public apellPatUsuario: string,
      public apellMatUsuario: string,
      public idTipoUsuario: number,
      public telefonoUsuario: string,
      public direccionUsuario: string,
      public emailUsuario: string,
      public numUsuario: number,
      public idEstado: number,
      public fechaActProductos: string) {
   }
}