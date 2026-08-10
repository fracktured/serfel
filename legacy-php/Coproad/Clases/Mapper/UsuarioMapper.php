<?php
require_once __DIR__.'/../POJO/Usuario.php';
//require_once __DIR__.'/../POJO/RegListPrecioProducto.php';

/**
 * Description of UsuarioMapper
 *
 * @author ccastro
 */
class UsuarioMapper {

    public static function fromEntityToDTO ( $usuario ) {
        $dto = [];
        $dto['idUsuario'] = $usuario->id_usuario;
        $dto['rutUsuario'] = $usuario->rut_usuario;
        $dto['dvUsuario'] = $usuario->dv_usuario;
        $dto['nomUsuario'] = $usuario->nom_usuario;
        $dto['apellPatUsuario'] = $usuario->apell_pat_usuario;
        $dto['apellMatUsuario'] = $usuario->apell_mat_usuario;
        $dto['idTipoUsuario'] = $usuario->id_tipo_usuario;
        $dto['telefonoUsuario'] = $usuario->telefono_usuario;
        $dto['direccionUsuario'] = $usuario->direccion_usuario;
        $dto['emailUsuario'] = $usuario->email_usuario;
        $dto['numUsuario'] = $usuario->num_usuario;
        $dto['idUsuarioMod'] = $usuario->id_usuario_mod;
        $dto['ultFechaMod'] = $usuario->ult_fecha_mod;
        $dto['idEstado'] = $usuario->id_estado;
        $dto['fechaActProductos'] = $usuario->fecha_act_productos;
        
        return $dto;
    }

    public static function fromEntitysToDTOs ( $usuarios ) {
        $dtos = [];
        $i = 0;
        foreach( $usuarios as $usuario ) {
            $dtos[$i] = UsuarioMapper::fromEntityToDTO( $usuario );
            $i++;
        }
        
        return $dtos;
    }

}