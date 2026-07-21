<?php
require_once __DIR__.'/../POJO/LocalCliente.php';
require_once __DIR__.'/../POJO/RegListLocalRuta.php';

/**
 * Description of LocalClienteMapper
 *
 * @author ccastro
 */
class LocalClienteMapper {

    public static function fromEntityToDTO ( $local ) {
        $dto = [];
        $dto['rutCliente'] = $local->rut_cliente;
        $dto['dvCliente'] = $local->dv_cliente;
        $dto['idLocalCliente'] = $local->id_local_cliente;
        $dto['nomLocalCliente'] = $local->nom_local_cliente;
        $dto['direccionLocalCliente'] = $local->direccion_local_cliente;
        $dto['telefonoLocalCliente'] = $local->telefono_local_cliente;
        $dto['nomContacto'] = $local->nom_contacto;
        $dto['apellPatContacto'] = $local->apell_pat_contacto;
        $dto['apellMatContacto'] = $local->apell_mat_contacto;
        $dto['telefonoContacto'] = $local->telefono_contacto;
        $dto['razonSocial'] = $local->razon_social;
        $dto['idListaPrecio'] = $local->id_lista_precio;
        $dto['pedidos'] = $local->pedidos;
        $dto['permiteVentaDeuda'] = $local->permite_venta_deuda;
        $dto['topeVenta'] = $local->tope_venta;
        $dto['permiteVentaTopeMensual'] = $local->permite_venta_tope_mensual;
        
        return $dto;
    }

    public static function fromEntitysToDTOs ( $locales ) {
        $dtos = [];
        $i = 0;
        foreach( $locales as $local ) {
            $dtos[$i] = LocalClienteMapper::fromEntityToDTO( $local );
            $i++;
        }
        
        return $dtos;
    }

}