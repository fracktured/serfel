<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Empresa.php");

    session_start();

    if(isset($_POST["rutEmpresa"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $empresa = new Empresa();
    
        $json["resultado"] = $empresa->elimEmpresa($_POST["rutEmpresa"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>
