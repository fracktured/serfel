/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 09-08-2011                                        *
 * Desc : Funciones de pagina de registro                   *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    //$("#rut").on("change", fnExisteCliente);
    
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
    
    $("#puReingresarCliente").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {
                $(this).dialog("close");
                fnReingresarCliente();
            },
            "Cancelar": function() {
                $(this).dialog("close");
            }
        }
    });
});

function fnExisteCliente() {
    $.ajax({
        data: {
            cRutCliente: $("#rut").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Cliente/ajaxExisteCliente.php",
        success : function(oJson) {
            if(oJson.cPopUp != "") {
                $("#" + oJson.cPopUp + "Mensaje").html(oJson.cMensaje);
                $("#" + oJson.cPopUp).dialog("open");
            } else if(oJson.cMensaje != "") {
                alert(oJson.cMensaje);
            }
        },
        error: function(xhr, status, error) {
            var err = JSON.parse(xhr.responseText);
            alert("ingCliente:fnExisteCliente\n" + err.Message);
        }
    });
}

function fnReingresarCliente() {
    $("#popUpCargando").dialog("open");
        
    $.ajax({
        data: {
            cRutCliente: $("#rut").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Cliente/ajaxReingresarCliente.php",
        success : function(oJson) {
            $("#popUpCargando").dialog("close");

            $("#popUp").dialog({
                autoOpen: false,
                modal   : true,
                buttons : {
                    "Ok": function() {
                        if(oJson.bReload) {
                            location.reload();
                        } else {
                            $(this).dialog("close");
                        }
                    }
                }
            });

            $("#popUp").dialog({title: "Reingresar Cliente"});
            $("#popUpMsg").html(oJson.cMensaje);
            $("#popUp").dialog("open");
        },
        error: function(xhr, status, error) {
            var err = JSON.parse(xhr.responseText);
            alert("ingCliente:fnExisteCliente\n" + err.Message);
        }
    });
}

function registrarse() {
    var rut        = new Array();
    var errores    = false;
    var errorRut   = false;
    var errorEmail = false;

    rut = $("#rut").val().split("-");

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("rut", "") || !rutValido(rut[0], rut[1])) errorRut = true;
    if(validaInputVacio("razonSocial", "")) errores = true;
    if(validaInputVacio("nomFantasia", "")) errores = true;
    //if(validaInputVacio("fonoClie", ""))    errores = true;
    if(validaInputVacio("direClie", ""))    errores = true;
    //if(validaInputVacio("comuna", ""))      errores = true;

    if($("#emailClie").val() != "" && !validaEmail($("#emailClie").val())) {
        $("#emailClie").attr("class", "inputError");
        errorEmail = true;
    } else {
        $("#emailClie").attr("class", "");
    }

    if(errores)             mensajesPopUpError("vacios");
    else if(errorRut)       mensajesPopUpError("rut");
    else if(errorEmail)     mensajesPopUpError("email");
    else {
        $.ajax({
            data: {
                rut        : $("#rut").val(),
                razonSocial: $("#razonSocial").val(),
                nomFantasia: $("#nomFantasia").val(),
                fonoClie   : $("#fonoClie").val(),
                direClie   : $("#direClie").val(),
                //comuna     : $("#comuna").val(),
                emailClie  : $("#emailClie").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Clientes/ingCliente/validaIngCliente.php",
            success : function(json) {
                if(json.resultado > 0) {
                    $("#popUpRegistroExitoso").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Rut ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
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
    $("#razonSocial").val("");
    $("#nomFantasia").val("");
    $("#fonoClie").val("");
    $("#direClie").val("");
    //$("#comuna").val();
    $("#emailClie").val("");
}
