<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/NotaCredito.php");
include("../../Clases/Fecha.php");

    if(isset($_POST["rutEmpresa"]) && isset($_POST["numNotaCredito"])) {
        $notaCredito = new NotaCredito("../../", $_POST["numNotaCredito"], $_POST["rutEmpresa"]);
        
        if($notaCredito->getIdNotaCredito() > 0) {
            $json["resultado"] = 1;
        } else {
            $json["resultado"] = 0;
        }

        echo json_encode($json);
    }
?>
