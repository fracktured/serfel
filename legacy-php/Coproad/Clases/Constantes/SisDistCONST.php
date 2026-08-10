<?php

/**
 * Description of SisDistCONST
 *
 * @author ccastro
 */
class SisDistCONST {
    
    const URL_PAGINA_PERMISO_DENEGADO = "SisDist.php?act=pemisoDenegado";
    
    const ID_FILTRO_TODOS = -999;
    
    const POJO_PRODUCTO = "Producto";
    const POJO_MARCA = "Marca";
    const POJO_UNIDAD_MEDIDA = "UnidadMedida";
    const POJO_CLIENTE = "Cliente";
    const POJO_PEDIDO = "Pedido";
    
    const TABLA_PRODUCTO = "20_m_producto";
    const TABLA_MARCA = "20_p_marca";
    const TABLA_UNIDAD_MEDIDA = "20_p_unidad_medida";
    const TABLA_CLIENTE = "10_m_cliente";
    const TABLA_PEDIDO = "30_m_pedido";
    
    const PK_PRODUCTO = "id_producto";
    const PK_MARCA = "id_marca";
    const PK_UNIDAD_MEDIDA = "id_UM";
    const PK_CLIENTE = "rut_cliente";
    const PK_PEDIDO = "id_pedido";
}
