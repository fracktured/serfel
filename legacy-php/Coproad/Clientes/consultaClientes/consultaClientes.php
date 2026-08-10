<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

?>

<div id="consultaClientes" class="">
    <form action="javascript:consultarCliente()">
        <h1>Ingrese Rut Cliente
            <input type="text" id="rutCliente" name="rutcliente" value="" />
            <button id="consultarCliente">Consultar Cliente</button>
        </h1>
    </form>
    
    <div id="datosCliente">
        
    </div>
</div>

<?php include("popUps/popUpError.php"); ?>