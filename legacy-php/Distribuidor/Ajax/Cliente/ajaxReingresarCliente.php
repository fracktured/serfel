<?php
require_once '../../Clases/Controlador/ClienteCTRL.php';

$oCTRL = new ClienteCTRL();
$oAjaxDTO = $oCTRL->ajaxReingresarCliente();

echo json_encode($oAjaxDTO);