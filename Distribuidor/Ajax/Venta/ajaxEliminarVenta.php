<?php
require_once '../../Clases/Controlador/VentaCTRL.php';
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
$oCTRL = new VentaCTRL("../../");
$oAjaxDTO = $oCTRL->ajaxEliminarVenta();

echo json_encode($oAjaxDTO);