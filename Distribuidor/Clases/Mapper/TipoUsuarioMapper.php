<?php
require_once __DIR__.'/../POJO/TipoUsuario.php';

/**
 * Description of TipoUsuarioMapper
 *
 * @author ccastro
 */
class TipoUsuarioMapper {

    public static function fromEntityToDTO ( $tipoUsuario ) {
        $dto = [];
        $dto['idTipoUsuario'] = $tipoUsuario->id_tipo_usuario;
        $dto['nomTipoUsuario'] = $tipoUsuario->nom_tipo_usuario;
        $dto['descTipoUsuario'] = $tipoUsuario->desc_tipo_usuario;
        
        return $dto;
    }

    public static function fromEntitysToDTOs ( $tiposUsuario ) {
        $dtos = [];
        $i = 0;
        foreach( $tiposUsuario as $tipoUsuario ) {
            $dtos[$i] = UsuarioMapper::fromEntityToDTO( $tipoUsuario );
            $i++;
        }
        
        return $dtos;
    }

}