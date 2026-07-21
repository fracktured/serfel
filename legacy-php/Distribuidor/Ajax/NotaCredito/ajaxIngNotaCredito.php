<?php
require_once '../../Clases/Controlador/NotaCreditoCTRL.php';
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
$oCTRL = new NotaCreditoCTRL("../../");
$oAjaxDTO = $oCTRL->ajaxIngNotaCredito();

echo json_encode($oAjaxDTO);