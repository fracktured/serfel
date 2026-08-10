<?php
require_once __DIR__ . '/../Conexion/Conexion.php';
require_once __DIR__ . '/../DAO/VendedorDAO.php';
require_once __DIR__ . '/../Factory/DTO/SelectItem.php';
require_once __DIR__ . '/../Constantes/UsuarioCONST.php';

/**
 * Description of VendedorNEG
 *
 * @author ccastro
 */
class VendedorNEG {

    /**
     * Retorna listado de vendedores
     *
     * @return Array<SelectItem>
     */
    public static function listVendedoresSI() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        $listVendedores = VendedorDAO::listUsuarios($oPDO, UsuarioCONST::VENDEDOR);
        $listVendedoresSI = [];
        $i = 0;
        $listVendedoresSI[$i] = new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS");
        $i++;
        foreach($listVendedores as $oUsuario) {
            $listVendedoresSI[$i] = new SelectItem($oUsuario->id_usuario, $oUsuario->obtNomCompleto());
            $i++;
        }
        return $listVendedoresSI;
    }

}
