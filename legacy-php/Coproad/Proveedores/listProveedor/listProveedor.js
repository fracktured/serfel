/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 11-01-2012                                        *
 * Desc : Funciones de pagina de lista de proveedores       *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingProveedor").click(ingProveedor);
    $("#tablaProveedor").dataTable({
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
                $("#rutProvElim").val("");
            },
            'Eliminar este Proveedor': function() {
                elimProveedorBD($("#rutProvElim").val());
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
            'Modificar este Proveedor': function() {
                modProveedorBD();
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

function ingProveedor() {
    $("#spanRutProv").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso de Proveedores",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nuevo Proveedor': function() {
                ingProveedorBD();
            }
        },
        close   : function() { document.location.href = document.location.href; }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingProveedorBD() {
    var rut        = new Array();
    var errores    = false;
    var errorRut   = false;

    rut = $("#rut").val().split("-");

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("rut", "") || !rutValido(rut[0], rut[1])) errorRut = true;
    if(validaInputVacio("razonSocial", "largo")) errores = true;
    if(validaInputVacio("nomFantasia", "largo")) errores = true;
    if(validaInputVacio("direProv", "largo"))    errores = true;

    if(errores)       mensajesPopUpError("vacios");
    else if(errorRut) mensajesPopUpError("rut");
    else {
        $.ajax({
            data: {
                rutProveedor  : $("#rut").val(),
                razonSocial   : $("#razonSocial").val(),
                nomFantasia   : $("#nomFantasia").val(),
                direProveedor : $("#direProv").val(),
                giroProveedor : $("#giroProv").val(),
                fono1         : $("#fono1").val(),
                fono2         : $("#fono2").val(),
                emailProveedor: $("#emailProv").val(),
                condPago      : $("#condPago").val(),
                glosaPago     : $("#glosaPago").val(),
                nomVendedor   : $("#nomVendedor").val(),
                fonoVendedor  : $("#fonoVendedor").val(),
                emailVendedor : $("#emailVendedor").val(),
                observaciones : $("#observaciones").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Proveedores/listProveedor/ingProveedor.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Proveedores" });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nuevo Proveedor ingresado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Proveedor ya se encuentra ingresada al Sistema.");
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

function modProveedor(rutProveedor) {
    $("#rut").hide();
    $("#spanRutProv").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Proveedor",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar este Proveedor': function() {
                modProveedorBD();
            }
        },
        close   : function() { document.location.href = document.location.href; }
    });
    
    $.ajax({
        data: {
            rutProveedor: rutProveedor
        },
        type    : "POST",
        dataType: "json",
        url     : "Proveedores/Globales/obtInfoProveedor.php",
        success : function(json) {
            $("#rutProvIngMod").val(rutProveedor);
            $("#spanRutProv").html(json.rut_completo);
            $("#razonSocial").val(json.razon_social);
            $("#nomFantasia").val(json.nom_fantasia);
            $("#direProv").val(json.direccion);
            $("#giroProv").val(json.giro);
            $("#fono1").val(json.fono1);
            $("#fono2").val(json.fono2);
            $("#emailProv").val(json.email);
            $("#condPago").val(json.cond_pago);
            $("#glosaPago").val(json.glosa_pago);
            $("#nomVendedor").val(json.nom_vendedor);
            $("#fonoVendedor").val(json.fono_vendedor);
            $("#emailVendedor").val(json.email_vendedor);
            $("#observaciones").val(json.observaciones);
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#rutProvIngMod").val("");
    $("#spanRutProv").html("");
    $("#rut").val("");
    $("#razonSocial").val("");
    $("#nomFantasia").val("");
    $("#direProv").val("");
    $("#giroProv").val("");
    $("#fono1").val("");
    $("#fono2").val("");
    $("#emailProv").val("json.email");
    $("#condPago").val("");
    $("#glosaPago").val("");
    $("#nomVendedor").val("");
    $("#fonoVendedor").val("");
    $("#emailVendedor").val("");
    $("#observaciones").val("");
}

function modProveedorBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("razonSocial", "largo")) errores = true;
    if(validaInputVacio("nomFantasia", "largo")) errores = true;
    if(validaInputVacio("direProv", "largo"))     errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                rutProveedor : $("#rutProvIngMod").val(),
                razonSocial  : $("#razonSocial").val(),
                nomFantasia  : $("#nomFantasia").val(),
                direProveedor: $("#direProv").val(),
                giroProveedor : $("#giroProv").val(),
                fono1         : $("#fono1").val(),
                fono2         : $("#fono2").val(),
                emailProveedor: $("#emailProv").val(),
                condPago      : $("#condPago").val(),
                glosaPago     : $("#glosaPago").val(),
                nomVendedor   : $("#nomVendedor").val(),
                fonoVendedor  : $("#fonoVendedor").val(),
                emailVendedor : $("#emailVendedor").val(),
                observaciones : $("#observaciones").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Proveedores/listProveedor/modProveedor.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Modificar Proveedor" });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("El Proveedor: <br>"
                                                 + $("#" + $("#rutProvIngMod").val() + "-RazSoc").val() + "<br>ha sido modificado exitosamente.");
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

function elimProveedor(rutProveedor) {
    $("#rutProvElim").val(rutProveedor);
    $("#nomProveedorElim").text($("#" + rutProveedor + "-RazSoc").val());
    $("#popUpElim").dialog("open");
}

function elimProveedorBD(rutProveedor) {
    $.ajax({
        data: {
            rutProveedor: rutProveedor
        },
        type    : "POST",
        dataType: "json",
        url     : "Proveedores/listProveedor/elimProveedor.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Proveedores" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Proveedor: <br>" 
                                             + $("#" + rutProveedor + "-RazSoc").val() + "<br>ha sido eliminado del Sistema.");
                $("#popUpExito").dialog("open");
            }
            
            $("#rutEmpElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}