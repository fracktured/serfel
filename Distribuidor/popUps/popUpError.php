<script type="text/javascript">
    function iniPopUpError() {
        $("#popUpError").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() { $(this).dialog("close"); }
            }
        });
    }
    
    function mensajesPopUpError(tipoError) {
        if(tipoError == "vacios") {
            $("#popUpErrorMensaje").html("Faltan datos que ingresar.<br />LLene los campos en rojo para continuar.");
            $("#popUpError").dialog("open");
        } else if(tipoError == "rut") {
            $("#rut").attr("class", "inputError");
            $("#popUpErrorMensaje").html("El Rut que ha ingresado<br /> es inválido.");
            $("#popUpError").dialog("open");
        } else if(tipoError == "largoPass") {
            $("#passwordUsu").val("");
            $("#rePasswordUsu").val("");
            $("#passwordUsu").attr("class", "inputError");
            $("#rePasswordUsu").attr("class", "inputError");
            $("#popUpErrorMensaje").html("La contraseña que ha ingresado<br /> debe tener 6 o mas caracteres.");
            $("#popUpError").dialog("open");
        } else if(tipoError == "distintaPass") {
            $("#passwordUsu").val("");
            $("#rePasswordUsu").val("");
            $("#passwordUsu").attr("class", "inputError");
            $("#rePasswordUsu").attr("class", "inputError");
            $("#popUpErrorMensaje").html("Las contraseñas que ha ingresado<br /> deben ser iguales.");
            $("#popUpError").dialog("open");
        } else if(tipoError == "email") {
            $("#popUpErrorMensaje").html("El Email ingresado es inválido.");
            $("#popUpError").dialog("open");
        } else if(tipoError == "inesperado") {
            $("#popUpErrorMensaje").html("Error en la comunicación con el servidor. Pruebe otra vez");
            $("#popUpError").dialog("open");
        }
    }
</script>

<div id="popUpError" title="Se ha encontrado un problema">
    <p id="popUpErrorMensaje" class="popUp">

    </p>
</div>