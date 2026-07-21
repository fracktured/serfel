/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 09-08-2011                                        *
 * Desc : Funciones de pagina de registro                   *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#popUpRegistroExitoso").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() { $(this).dialog("close"); }
        },
        close   : cerrarPopUpRegistroExitoso
    });
});

function registrarse() {
    var rut            = new Array();
    var errores        = false;
    var errorRut       = false;
    var errorPassLargo = false;
    var errorPassDist  = false;
    var errorEmail     = false;

    rut = $("#rut").val().split("-");

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("rut", "") || !rutValido(rut[0], rut[1])) errorRut = true;
    if($("#cmbTipoUsu").val() == 2 && validaInputVacio("numero", "")) errores = true;
    if(validaInputVacio("nombres", "")) errores = true;
    if(validaInputVacio("paterno", "")) errores = true;
    if(validaInputVacio("fonoUsu", "")) errores = true;
    if(validaInputVacio("direUsu", "")) errores = true;
    if(validaInputVacio("passwordUsu", "") || $("#passwordUsu").val().length < 6) errorPassLargo = true;
    if(validaInputVacio("rePasswordUsu", "") || $("#rePasswordUsu").val() != $("#passwordUsu").val()) errorPassDist = true;

    if(!validaEmail($("#emailUsu").val())) {
        $("#emailUsu").attr("class", "inputError");
        errorEmail = true;
    } else {
        $("#emailUsu").attr("class", "");
    }

    if(errores)             mensajesPopUpError("vacios");
    else if(errorRut)       mensajesPopUpError("rut");
    else if(errorPassLargo) mensajesPopUpError("largoPass");
    else if(errorPassDist)  mensajesPopUpError("distintaPass");
    else if(errorEmail)     mensajesPopUpError("email");
    else {
        $.ajax({
            data: {
                numero       : $("#numero").val(),
                rut          : $("#rut").val(),
                nombres      : $("#nombres").val(),
                paterno      : $("#paterno").val(),
                materno      : $("#materno").val(),
                emailUsu     : $("#emailUsu").val(),
                fonoUsu      : $("#fonoUsu").val(),
                direUsu      : $("#direUsu").val(),
                passwordUsu  : hex_md5($("#passwordUsu").val()),
                rePasswordUsu: hex_md5($("#rePasswordUsu").val()),
                idTipoUsu    : $("#cmbTipoUsu").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/ingUsuario/validaIngUsuario.php",
            success : function(json) {
                if(json.resultado > 0) {
                    $("#popUpRegistroExitoso").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Rut ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                } else if(json.resultado == -3) {
                    $("#popUpErrorMensaje").html("El N° de Usuario ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() {
                alert("error");
            }
        });
    }
}

function cerrarPopUpRegistroExitoso() {
    $("#rut").val("");
    $("#nombres").val("");
    $("#paterno").val("");
    $("#materno").val("");
    $("#emailUsu").val("");
    $("#fonoUsu").val("");
    $("#direUsu").val("");
    $("#passwordUsu").val("");
    $("#rePasswordUsu").val("");
}