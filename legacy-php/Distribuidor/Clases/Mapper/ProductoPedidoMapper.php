<?php
require_once __DIR__.'/../POJO/ProductoPedido.php';

/**
 * Description of ProductoPedidoMapper
 *
 * @author ccastro
 */
class ProductoPedidoMapper {

    public static function fromEntityToDTO ( $producto ) {
        $dto = [];
        //$dto['idPedido'] = $producto->id_pedido;
        $dto['idProducto'] = $producto->id_producto;
        $dto['cantidad'] = $producto->cantidad;
        $dto['precio'] = $producto->precio;
        $dto['porcenDesc'] = $producto->porcen_desc;
        $dto['precioNeto'] = $pedido->precio_neto;

        return $dto;                
    }

    public static function fromEntitysToDTOs ( $productos ) {
        $dtos = [];
        $i = 0;
        foreach( $productos as $producto ) {
            $dtos[$i] = ProductoPedidoMapper::fromEntityToDTO( $producto );
            $i++;
        }
        
        return $dtos;
    }


    public static function fromDTOToEntity ( $dto ) {
        $producto = new ProductoPedido();
        /*if ( !empty($dto['idPedido']) ) {
            $producto->id_pedido = $dto['idPedido'];
        }*/
        $producto->id_producto = $dto['idProducto'];
        $producto->cantidad = $dto['cantidad'];
        $producto->precio = $dto['precio'];
        $producto->porcen_desc = $dto['porcenDesc'];
        $producto->precio_neto = $dto['precioNeto'];

        return $producto;                
    }

    public static function fromDTOsToEntitys ( $dtos ) {
        $productos = [];
        $i = 0;
        foreach( $dtos as $dto ) {
            $productos[$i] = ProductoPedidoMapper::fromDTOToEntity( $dto );
            $i++;
        }
        
        return $productos;
    }

}
