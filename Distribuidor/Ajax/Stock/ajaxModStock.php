<?php
require_once '../../Clases/Controlador/StockCTRL.php';

$oCTRL = new StockCTRL("../../", true);
$oAjaxDTO = $oCTRL->ajaxModificarStock();

echo json_encode($oAjaxDTO);