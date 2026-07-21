<?php
require_once '../../Clases/Controlador/ClienteCTRL.php';

echo json_encode( ClienteCTRL::clientes() );
?>