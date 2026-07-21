/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingEmpresa").click(ingEmpresa);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaEmpresas").dataTable({
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
        width: 400,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
	buttons: {
            'Cancelar': function() { 
                $(this).dialog('close'); 
                $("#rutEmpElim").val("");
            },
            'Eliminar esta Empresa': function() {
                elimEmpresaBD($("#rutEmpElim").val());
		$(this).dialog('close');
            }
	}
    });

    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Empresa': function() {
                modEmpresaBD();
            }
        },
        close   : limpiarPopUpIngMod
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

function ingEmpresa() {
    $("#spanRutEmp").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso de Empresas",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Empresa': function() {
                ingEmpresaBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingEmpresaBD() {
    var rut        = new Array();
    var errores    = false;
    var errorRut   = false;

    rut = $("#rut").val().split("-");

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("rut", "") || !rutValido(rut[0], rut[1])) errorRut = true;
    if(validaInputVacio("razonSocial", "largo")) errores = true;
    if(validaInputVacio("nomFantasia", "largo")) errores = true;
    if(validaInputVacio("direEmp", "largo"))     errores = true;

    if(errores)       mensajesPopUpError("vacios");
    else if(errorRut) mensajesPopUpError("rut");
    else {
        $.ajax({
            data: {
                rutEmpresa : $("#rut").val(),
                razonSocial: $("#razonSocial").val(),
                nomFantasia: $("#nomFantasia").val(),
                direEmpresa: $("#direEmp").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Empresas/listEmpresa/ingEmpresa.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Empresas" });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nueva Empresa ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("La Empresa ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function modEmpresa(rutEmpresa) {
    $("#rut").hide();
    $("#spanRutEmp").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Empresa",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Empresa': function() {
                modEmpresaBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $.ajax({
        data: {
            rutEmpresa: rutEmpresa
        },
        type    : "POST",
        dataType: "json",
        url     : "Empresas/Globales/obtInfoEmpresa.php",
        success : function(json) {
            $("#rutEmpIngMod").val(rutEmpresa);
            $("#spanRutEmp").html(json.rut_completo);
            $("#razonSocial").val(json.razon_social);
            $("#nomFantasia").val(json.nom_fantasia);
            $("#direEmp").val(json.direccion);
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#rutEmpIngMod").val("");
    $("#spanRutEmp").html("");
    $("#rut").val("");
    $("#razonSocial").val("");
    $("#nomFantasia").val("");
    $("#direEmp").val("");
}

function modEmpresaBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("razonSocial", "largo")) errores = true;
    if(validaInputVacio("nomFantasia", "largo")) errores = true;
    if(validaInputVacio("direEmp", "largo"))     errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                rutEmpresa : $("#rutEmpIngMod").val(),
                razonSocial: $("#razonSocial").val(),
                nomFantasia: $("#nomFantasia").val(),
                direEmpresa: $("#direEmp").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Empresas/listEmpresa/modEmpresa.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Modificar Empresa" });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("La Empresa: <br>"
                                                 + $("#" + $("#rutEmpIngMod").val() + "-RazSoc").val() + "<br>ha sido modificada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == -1) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function elimEmpresa(rutEmpresa) {
    $("#rutEmpElim").val(rutEmpresa);
    $("#nomEmpresaElim").text($("#" + rutEmpresa + "-RazSoc").val());
    $("#popUpElim").dialog("open");
}

function elimEmpresaBD(rutEmpresa) {
    $.ajax({
        data: {
            rutEmpresa: rutEmpresa
        },
        type    : "POST",
        dataType: "json",
        url     : "Empresas/listEmpresa/elimEmpresa.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Empresas" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Empresa: <br>" 
                                             + $("#" + rutEmpresa + "-RazSoc").val() + "<br>ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("La Empresa: <br>" 
                                             + $("#" + rutEmpresa + "-RazSoc").val() + "<br>tiene pedidos en proceso de pago.");
                $("#popUpExito").dialog("open");
            }
            $("#rutEmpElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}