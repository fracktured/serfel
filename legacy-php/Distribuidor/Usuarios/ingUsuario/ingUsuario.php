<!-- DIV "Registro" -->
<div id="datosRegistro" class="formulario">
    <form id="formRegistro" name="formRegistro" method="post" action="javascript:registrarse()">
        <h1>Formulario de Registro de Usuarios</h1>

        <label>N° Usuario
            <span class="small">Ingrese N°</span></label>
        <input type="text" id="numero" name="numero" maxlength="2" />
        
        <label>Rut
            <span class="small">11111111-1</span></label>
        <input type="text" id="rut" name="rut" maxlength="15" />

        <label>Nombres
            <span class="small">Ingrese Nombres</span></label>
        <input type="text" id="nombres" name="nombres" maxlength="50" />

        <label>Apellido Paterno
            <span class="small">Ingrese Apellido Paterno</span></label>
        <input type="text" id="paterno" name="paterno" maxlength="30" />

        <label>Apellido Materno
            <span class="small">Ingrese Apellido Materno</span></label>
        <input type="text" id="materno" name="materno" maxlength="30" />

        <label>Contraseña
            <span class="small">Mínimo 6 caracteres</span></label>
        <input type="password" id="passwordUsu" name="passwordUsu" maxlength="50" />

        <label>Reingresar Contraseña
            <span class="small">Reingrese la Contraseña</span></label>
        <input type="password" id="rePasswordUsu" name="rePasswordUsu" maxlength="50" />
        
        <label>Telefono
            <span class="small">Ingrese Telefono</span></label>
        <input type="text" id="fonoUsu" name="fonoUsu" maxlength="15" />
        
        <label>Dirección
            <span class="small">Ingrese Dirección</span></label>
        <input type="text" id="direUsu" name="direUsu" maxlength="200" />

        <label>Email
            <span class="small">Ingrese Email</span></label>
        <input type="text" id="emailUsu" name="emailUsu" maxlength="50" />

        <!-- Recuperar desde BD -->
        <label>Tipo Usuario
            <span class="small">Seleccione Tipo Usuario</span></label>
        <select id="cmbTipoUsu" name="cmbTipoUsu">
            <option value="2">Vendedor</option>
            <option value="1">Administrador</option>
            <option value="3">Secretaria</option>
        </select>

        <button id="btnRegistro">Registrar</button>
        <div class="espacio"></div>
    </form>
</div>

<div id="popUpRegistroExitoso" title="Ingreso de Usuarios">
    <p id="popUpRegistroExitosoMensaje" class="popUp">
        Registro ingresado con éxito
    </p>
</div>

<?php include("popUps/popUpError.php"); ?>