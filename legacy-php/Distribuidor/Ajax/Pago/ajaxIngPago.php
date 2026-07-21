<?php
require_once '../../Clases/Controlador/PagoCTRL.php';

echo json_encode( PagoCTRL::ajaxIngPago() );
?>