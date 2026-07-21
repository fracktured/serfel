<?php

/**
 * Description of RutaLocalClienteDAO
 *
 * @author ccastro
 */
class RutaLocalClienteDAO {
    
    private $rutaRelativa = "";
    
    
    public function __construct($rutaRelativa) {
        $this->rutaRelativa = $rutaRelativa;
    }
    
    
    public function listRutaLocalCliente($db, $idRuta) {
        include_once $this->rutaRelativa . "Clases/POJO/RutaLocalCliente.php";
        
        $query = "SELECT * FROM 40_m_ruta_local_cliente WHERE id_ruta = " . $idRuta;
        
        $resDB = mysql_query($query, $db) or die(mysql_error());
                
        $i = 0;
        $rutas = Array();
        while ($filaDB = mysql_fetch_assoc($resDB)) {
            						
            $rutas[$i] = new RutaLocalCliente($filaDB["id_ruta"], $filaDB["id_local_cliente"]);
            $i++;
        }
        
        return $rutas;
    }
    
}
