<?php
require_once __DIR__.'/../POJO/PrecioProducto.php';
//require_once __DIR__.'/../POJO/RegListProductoPedido.php';

/**
 * Description of PrecioProductoMapper
 *
 * @author ccastro
 */
class PrecioProductoMapper {

    public static function fromEntityToDTO ( $producto ) {
        $dto = [];
        $dto['idListaPrecio'] = $producto->id_lista_precio;
        $dto['idProducto'] = $producto->id_producto;
        $dto['nomProducto'] = $producto->nom_producto;
        $dto['nomMarca'] = $producto->nom_marca;
        $dto['nomUM'] = $producto->nom_UM;
        $dto['cantidadStock'] = $producto->cantidad_stock;
        $dto['cantidadPedida'] = $producto->cantidad_pedida;
        $dto['codSerfel'] = $producto->cod_serfel;
        $dto['precioNeto'] = $producto->precio_neto;
        $dto['precio'] = $producto->precio;
        $dto['maxPorcenDesc'] = $producto->max_porcen_desc;

        if ( !empty( $producto->id_pedido ) ) {
            $dto['idPedido'] = $producto->id_pedido;
            $dto['cantidad'] = $producto->cantidad;
            $dto['porcenDesc'] = $producto->porcen_desc;
        }

        return $dto;
    }

    public static function fromEntitysToDTOs ( $productos ) {
        $dtos = [];
        $i = 0;
        foreach( $productos as $producto ) {
            $dtos[$i] = PrecioProductoMapper::fromEntityToDTO( $producto );
            $i++;
        }
        
        return $dtos;
    }

}
