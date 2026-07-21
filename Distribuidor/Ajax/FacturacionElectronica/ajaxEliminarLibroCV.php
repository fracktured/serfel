<?php
require_once '../../Clases/Controlador/FacturacionElectronica/LibroCVCTRL.php';

$oLibroCVCTRL = new LibroCVCTRL("../../");
$oAjaxDTO = $oLibroCVCTRL->eliminarLibroCV();

echo json_encode($oAjaxDTO);