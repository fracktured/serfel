<?php
require_once '../../Clases/Controlador/GeneralCTRL.php';
require_once '../../Clases/Controlador/FacturacionElectronica/SubirLibroCVCTRL.php';

$oSubirLibroCVCTRL = new SubirLibroCVCTRL("../../");
$oAjaxDTO = $oSubirLibroCVCTRL->subirLiborCV();

echo json_encode($oAjaxDTO);