<?php
require_once __DIR__.'/../POJO/Pedido.php';
//require_once __DIR__.'/../POJO/RegListPrecioProducto.php';

/**
 * Description of PedidoMapper
 *
 * @author ccastro
 */
class PedidoMapper {

    public static function fromEntityToDTO ( $pedido ) {
        $dto = [];
        $dto['idPedido'] = $pedido->id_pedido;
        $dto['fechaPedido'] = $pedido->fecha_pedido;
        $dto['idLocalCliente'] = $pedido->id_local_cliente;
        $dto['diaRuta'] = $pedido->dia_ruta;
        $dto['idFormaPago'] = $pedido->id_forma_pago;
        $dto['tiempo'] = $pedido->tiempo;
        $dto['precioTotal'] = $pedido->precio_total;
        $dto['idUsuario'] = $pedido->id_usuario;
        $dto['idListaPrecio'] = $pedido->id_lista_precio;
        $dto['idEstado'] = $pedido->id_estado;

        return $dto;                
    }

    public static function fromEntitysToDTOs ( $pedidos ) {
        $dtos = [];
        $i = 0;
        foreach( $pedidos as $pedido ) {
            $dtos[$i] = PedidoMapper::fromEntityToDTO( $pedido );
            $i++;
        }
        
        return $dtos;
    }


    public static function fromDTOToEntity ( $dto ) {
        $pedido = new Pedido();
        if ( !empty($dto['idPedido']) ) {
            $pedido->id_pedido = $dto['idPedido'];
        }        
        //$pedido->fecha_pedido = $dto['fechaPedido'];
        $pedido->id_local_cliente = $dto['idLocalCliente'];
        $pedido->dia_ruta = $dto['diaRuta'];
        if ( !empty($dto['idFormaPago']) ) {
            $pedido->id_forma_pago = $dto['idFormaPago'];
        }
        //$pedido->tiempo = $dto['tiempo'];
        $pedido->precio_total = $dto['precioTotal'];
        //$pedido->id_usuario = $dto['idUsuario'];
        $pedido->id_lista_precio = $dto['idListaPrecio'];
        //$pedido->id_estado = $dto['idEstado'];

        return $pedido;                
    }

    public static function fromDTOsToEntitys ( $dtos ) {
        $pedidos = [];
        $i = 0;
        foreach( $dtos as $dto ) {
            $pedidos[$i] = PedidoMapper::fromDTOToEntity( $dto );
            $i++;
        }
        
        return $pedidos;
    }

}
