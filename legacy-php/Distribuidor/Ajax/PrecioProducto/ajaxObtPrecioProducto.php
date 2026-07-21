<?php
require_once __DIR__ . '/../../Clases/Controlador/PrecioProductoCTRL.php';

$oCTRL = new PrecioProductoCTRL();
$oAjaxDTO = $oCTRL->ajaxObtPrecioProducto();

echo json_encode($oAjaxDTO);