<?php
require_once __DIR__.'/../POJO/Producto.php';
require_once __DIR__.'/../POJO/RegListPrecioProducto.php';

/**
 * Description of PrecioProductoDAO
 *
 * @author ccastro
 */
class ProductoMapper {

    public static function fromEntityToDTO ( $producto ) {
        $dto = [];
        $dto['idProducto'] = $producto->id_producto;
        $dto['nomProducto'] = $producto->nom_producto;
        //$dto['descProducto'] = $producto->desc_producto;
        //$dto['codBarraProducto'] = $producto->cod_barra_producto;
        $dto['idTipoProducto'] = $producto->id_tipo_producto;
        $dto['familia'] = $producto->familia;
        $dto['subFamilia'] = $producto->sub_familia;
        $dto['idMarca'] = $producto->id_marca;
        $dto['nomMarca'] = $producto->nom_marca;
        $dto['idUM'] = $producto->id_UM;
        $dto['nomUM'] = $producto->nom_UM;
        $dto['idEstado'] = $producto->id_estado;
        $dto['codSerfel'] = $producto->cod_serfel;
        
        if ( !empty( $producto->id_usuario_mod ) ) {
            $dto['idUsuarioMod'] = $producto->id_usuario_mod;
            $dto['ultFechaMod'] = $producto->ult_fecha_mod;
        }
        if ( !empty( $producto->costo_prom ) ) {
            $dto['costoProm'] = $producto->costo_prom;
            $dto['ultFechaCompra'] = $producto->ult_fecha_compra;
        }
        if ( !empty( $producto->impuesto ) ) {
            $dto['impuesto'] = $producto->impuesto;
        }

        return $dto;
    }

    public static function fromEntitysToDTOs ( $productos ) {
        $dtos = [];
        $i = 0;
        foreach( $productos as $producto ) {
            $dtos[$i] = ProductoMapper::fromEntityToDTO( $producto );
            $i++;
        }
        
        return $dtos;
    }

}