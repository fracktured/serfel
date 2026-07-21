<?php
require_once __DIR__ . '/../Conexion/Conexion.php';
require_once __DIR__ . '/../POJO/Marca.php';
require_once __DIR__ . '/../DAO/MarcaDAO.php';
require_once __DIR__ . '/../Factory/DTO/SelectItem.php';

/**
 * Description of MarcaNEG
 *
 * @author ccastro
 */
class MarcaNEG {
    
    /**
     * Retorna listado SelectItem Marca
     * 
     * @return Array SelectItem
     */
    public static function listSI($bSITodos) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $marcasSI = [];
        if ( $bSITodos ) {
            $marcasSI = array_merge($marcasSI, [ new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS") ]);
        }
        foreach( MarcaDAO::lista($oPDO) as $marca ) {
            $marcasSI = array_merge($marcasSI, [ new SelectItem($marca->id_marca, $marca->nom_marca) ]);
        }
        
        return $marcasSI;
    }
}
