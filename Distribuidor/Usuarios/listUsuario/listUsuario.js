/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-12-2011                                        *
 * Desc : Funciones de pagina de lista de usuarios          *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingUsuario").click(function() { location.href = "SisDist.php?act=ingUsuario" });
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaUsuarios").dataTable({
        "bJQueryUI": true,
        "sPaginationType": "full_numbers",
        "bLengthChange": true,
        "bFilter": true,
        "bSort": true,
        "bInfo": false,
        "bAutoWidth": true,
        "oLanguage": {
            "sLengthMenu": "Mostrando _MENU_ resultados por página",
            "sZeroRecords": "No se han encontrado resultados",
            "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
            "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
            "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
            "sSearch": "Buscar"
        }
    });

    $("#popUpElim").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
	buttons: {
            'Cancelar': function() { 
                $(this).dialog('close'); 
                $("#idUsuarioElim").val("");
            },
            'Eliminar este Usuario': function() {
                elimUsuarioBD($("#idUsuarioElim").val());
		$(this).dialog('close');
            }
	}
    });

    $("#popUpMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 600,
        heigth: 300,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpMod();
            },
            'Modificar este Usuario': function() {
                modUsuarioBD();
            }
        },
        close   : function() { document.location.href = document.location.href; }
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() { document.location.href = document.location.href; }
        },
        close   : function() { document.location.href = document.location.href; }
    });
});

function modUsuario(idUsuario) {
    $("#passwordUsu").val("");
    $("#rePasswordUsu").val("");
    
    $.ajax({
        data: {
            idUsuario: idUsuario
        },
        type    : "POST",
        dataType: "json",
        url     : "Usuarios/Globales/obtInfoUsuario.php",
        success : function(json) {
            $("#idUsuarioMod").val(idUsuario);
            $("#numero").val(json.num_usuario);
            $("#rutUsu").html(json.rut_completo);
            $("#cmbTipoUsu option[value = '" + json.id_tipo_usu + "']").attr("selected", "selected");
            $("#paterno").val(json.paterno);
            $("#materno").val(json.materno);
            $("#nombres").val(json.nombres);
            $("#fonoUsu").val(json.telefono);
            $("#emailUsu").val(json.email);
            $("#direUsu").val(json.direccion);
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpMod").dialog("open");
}

function limpiarPopUpMod() {
    $("#idUsuarioMod").val("");
    $("#numero").val("");
    $("#rutUsu").html("");
    $("#paterno").val("");
    $("#materno").val("");
    $("#nombres").val("");
    $("#fonoUsu").val("");
    $("#emailUsu").val("");
    $("#direUsu").val("");
    $("#passwordUsu").val("");
    $("#rePasswordUsu").val("");
}

function modUsuarioBD() {
    var errores    = false;
    var errorEmail = false;
    var errorPassLargo = false;
    var errorPassDist  = false;
    
    if($("#cmbTipoUsu").val() == 2 && validaInputVacio("numero", "")) errores = true;
    if(validaInputVacio("nombres", "")) errores = true;
    if(validaInputVacio("paterno", "")) errores = true;
    if(validaInputVacio("fonoUsu", "")) errores = true;
    if(validaInputVacio("direUsu", "largo")) errores = true;
    if($("#passwordUsu").val() != "" && $("#passwordUsu").val().length < 6) errorPassLargo = true;
    if($("#passwordUsu").val() != "" && $("#rePasswordUsu").val() != $("#passwordUsu").val()) errorPassDist = true;

    if(!validaEmail($("#emailUsu").val())) {
        $("#emailUsu").attr("class", "inputError");
        errorEmail = true;
    } else {
        $("#emailUsu").attr("class", "");
    }

    if(errores)         mensajesPopUpError("vacios");
    else if(errorEmail) mensajesPopUpError("email");
    else if(errorPassLargo) mensajesPopUpError("largoPass");
    else if(errorPassDist)  mensajesPopUpError("distintaPass");
    else {
        var passwordUsu = "";
        var rePasswordUsu = "";
            
        if($("#passwordUsu").val() != "") {
            passwordUsu = hex_md5($("#passwordUsu").val());
            rePasswordUsu = hex_md5($("#rePasswordUsu").val());
        }
        
        $.ajax({
            data: {
                idUsuario: $("#idUsuarioMod").val(),
                numero   : $("#numero").val(),
                nombres  : $("#nombres").val(),
                paterno  : $("#paterno").val(),
                materno  : $("#materno").val(),
                emailUsu : $("#emailUsu").val(),
                fonoUsu  : $("#fonoUsu").val(),
                direUsu  : $("#direUsu").val(),
                idTipoUsu: $("#cmbTipoUsu").val(),
                passwordUsu  : passwordUsu,
                rePasswordUsu: rePasswordUsu
            },
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/listUsuario/modUsuario.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Modificación de Usuarios" });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("El Usuario: <br>"
                                                 + $("#" + $("#idUsuarioMod").val() + "-NomCom").val() + "<br>ha sido modificado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                } else if(json.resultado == -3) {
                    $("#popUpErrorMensaje").html("El N° de Usuario ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                }
                //setTimeout("$('#popUpMod').dialog('close')",1250);
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function elimUsuario(idUsuario) {
    $("#idUsuarioElim").val(idUsuario);
    $("#nomUsuarioElim").text($("#" + idUsuario + "-NomCom").val());
    $("#popUpElim").dialog("open");
}

function elimUsuarioBD(idUsuario) {
    $.ajax({
        data: {
            idUsuario: idUsuario
        },
        type    : "POST",
        dataType: "json",
        url     : "Usuarios/listUsuario/elimUsuario.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Usuarios" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Usuario: <br>" 
                                             + $("#" + idUsuario + "-NomCom").val() + "<br>ha sido eliminado del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Usuario: <br>" 
                                             + $("#" + idUsuario + "-NomCom").val() + "<br>tiene pedidos en proceso de pago.");
                $("#popUpExito").dialog("open");
            }
            $("#idUsuarioElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}