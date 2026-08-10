<?php
require_once '../../Clases/Controlador/VentaCTRL.php';

$oCTRL = new VentaCTRL("../../");
$oAjaxDTO = $oCTRL->ajaxAnularVenta();

echo json_encode($oAjaxDTO);