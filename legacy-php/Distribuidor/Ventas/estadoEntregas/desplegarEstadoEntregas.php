<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Ruta.php");
include("../../Globales/funciones.php");
require_once __DIR__.'/../../Clases/Constantes/UsuarioCONST.php';

    session_start();

    if(isset($_POST["idRuta"]) && isset($_POST["entregado"]) 
            && ($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR 
                    || $_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::SECRETARIO)) {
        $ruta = new Ruta("../../");
        $json = $ruta->getListaEstadoRutario($_POST["idRuta"], $_POST["entregado"]);

        echo json_encode(utf8ize($json));
    }
?>