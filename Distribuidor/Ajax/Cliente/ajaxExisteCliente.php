<?php
require_once '../../Clases/Controlador/ClienteCTRL.php';

$oCTRL = new ClienteCTRL();
$oAjaxDTO = $oCTRL->ajaxExisteCliente();

echo json_encode($oAjaxDTO);