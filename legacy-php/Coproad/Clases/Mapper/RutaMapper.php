<?php
require_once __DIR__.'/../POJO/Ruta.php';

/**
 * Description of RutaMapper
 *
 * @author ccastro
 */
class RutaMapper {

    public static function fromEntityToDTO ( $ruta ) {
        $dto = [];
        $dto['idRuta'] = $ruta->id_ruta;
        $dto['nomRuta'] = $ruta->nom_ruta;
        $dto['idUsuario'] = $ruta->id_usuario;
        $dto['numDia'] = $ruta->num_dia;
        
        return $dto;
    }

    public static function fromEntitysToDTOs ( $rutas ) {
        $dtos = [];
        $i = 0;
        foreach( $rutas as $ruta ) {
            $dtos[$i] = RutaMapper::fromEntityToDTO( $ruta );
            $i++;
        }
        
        return $dtos;
    }

}