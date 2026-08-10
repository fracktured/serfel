<?php
require_once '../../Clases/Controlador/RecepcionCTRL.php';

$oCTRL = new RecepcionCTRL();
$oAjaxDTO = $oCTRL->ajaxCrearNotaCreditoCompra();

echo json_encode($oAjaxDTO);