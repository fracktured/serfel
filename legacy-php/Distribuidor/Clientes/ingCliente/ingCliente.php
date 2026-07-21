<!-- DIV "Registro" -->
<div id="datosRegistro" class="formulario">
    <form id="formRegistro" name="formRegistro" method="post" action="javascript:registrarse()">
        <h1>Formulario de Registro de Clientes</h1>

        <label>Rut
            <span class="small">11111111-1</span></label>
        <input type="text" id="rut" name="rut" maxlength="15" onchange="javascript:fnExisteCliente();" />

        <label>Razon Social
            <span class="small">Ingrese Razon Social</span></label>
        <input type="text" id="razonSocial" name="razonSocial" maxlength="50" />

        <label>Nombre Fantasia
            <span class="small">Ingrese Nombre Fantasia</span></label>
        <input type="text" id="nomFantasia" name="nomFantasia" maxlength="50" />

        <label>Telefono
            <span class="small">Ingrese Telefono</span></label>
        <input type="text" id="fonoClie" name="fonoClie" maxlength="15" />
        
        <label>Dirección
            <span class="small">Ingrese Dirección</span></label>
        <input type="text" id="direClie" name="direClie" maxlength="200" />

        <label>Email
            <span class="small">Ingrese Email</span></label>
        <input type="text" id="emailClie" name="emailClie" maxlength="50" />

        <button id="btnRegistro">Registrar</button>
        <div class="espacio"></div>
    </form>
</div>

<div id="popUpRegistroExitoso" title="Ingreso de Clientes">
    <p id="popUpRegistroExitosoMensaje" class="popUp">
        Registro ingresado con éxito
    </p>
</div>

<div id="puReingresarCliente" title="Reingresar Cliente">
    <p id="puReingresarClienteMensaje" class="popUp">
    </p>
</div>


<?php 
include("popUps/popUpError.php"); 
require_once 'popUps/popUp.php';
?>