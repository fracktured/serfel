export class TipoUsuarioModel {
    constructor(
        public idTipoUsuario: number,
        public nomTipoUsuario: string,
        public descTipoUsuario: string
    ) { }
}

export enum TipoUsuario {
    Administrador = 'Administrador',
    Vendedor = 'Vendedor',
    Secretaria = 'Secretaria'
}