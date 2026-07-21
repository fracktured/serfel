<?php
require_once '../../Clases/Controlador/EstadoEntregaChoferCTRL.php';

    $estEntChoferCTRL = new EstadoEntregaChoferCTRL("../../");
    $estEntChoferDTO = $estEntChoferCTRL->ajaxIngModEntregaChofer();
    
    echo \json_encode($estEntChoferDTO);