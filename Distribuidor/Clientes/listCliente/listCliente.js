/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-12-2011                                        *
 * Desc : Funciones de pagina de lista de usuarios          *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingCliente").click(function() {location.href = "SisDist.php?act=ingCliente"});
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaClientes").dataTable({
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
                $("#rutClienteElim").val("");
            },
            'Eliminar este Cliente': function() {
                elimClienteBD($("#rutClienteElim").val());
		$(this).dialog('close');
            }
	}
    });

    $("#popUpMod").dialog({
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
                limpiarPopUpMod();
            },
            'Modificar este Cliente': function() {
                modClienteBD();
            }
        }
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {document.location.href = document.location.href;}
        },
        close   : function() {document.location.href = document.location.href;}
    });
});

function modCliente(rutCliente) {
    $.ajax({
        data: {
            rutCliente: rutCliente
        },
        type    : "POST",
        dataType: "json",
        url     : "Clientes/Globales/obtInfoCliente.php",
        success : function(json) {
            $("#rutClienteMod").val(rutCliente);
            $("#rutClie").html(json.rut_completo);
            $("#razonSocial").val(json.razon_social);
            $("#nomFantasia").val(json.nom_fantasia);
            $("#fonoClie").val(json.telefono);
            $("#emailClie").val(json.email);
            $("#direClie").val(json.direccion);
            //$("#comuna").val(json.comuna);
            $("#cmbListaPrecio option[value = " + json.id_lista_precio + "]").attr("selected", "selected");

            if ( json.permite_venta_deuda == 1 ) {
                $("#chkVentaCDeuda").attr("checked", "checked");
            }
        },
        error: function() {alert("Error desconocido");}
    });

    $("#popUpMod").dialog("open");
}

function limpiarPopUpMod() {
    $("#rutClienteMod").val("");
    $("#rutClie").html("");
    $("#razonSocial").val("");
    $("#nomFantasia").val("");
    $("#fonoClie").val("");
    $("#emailClie").val("");
    $("#direClie").val("");
    //$("#comuna").val("");
}

function modClienteBD() {
    var errores    = false;
    var errorEmail = false;
    
    if(validaInputVacio("razonSocial", "largo")) errores = true;
    if(validaInputVacio("nomFantasia", "largo")) errores = true;
    //if(validaInputVacio("fonoClie", ""))         errores = true;
    if(validaInputVacio("direClie", "largo"))    errores = true;
    //if(validaInputVacio("comuna", ""))           errores = true;

    if($("#emailClie").val() != "" && !validaEmail($("#emailClie").val())) {
        $("#emailClie").attr("class", "inputError");
        errorEmail = true;
    } else {
        $("#emailClie").attr("class", "");
    }

    if(errores)         mensajesPopUpError("vacios");
    else if(errorEmail) mensajesPopUpError("email");
    else {
        $.ajax({
            data: {
                rutCliente : $("#rutClienteMod").val(),
                razonSocial: $("#razonSocial").val(),
                nomFantasia: $("#nomFantasia").val(),
                fonoClie   : $("#fonoClie").val(),
                direClie   : $("#direClie").val(),
                //comuna     : $("#comuna").val(),
                emailClie  : $("#emailClie").val(),
                idListaPrecio: $("#cmbListaPrecio").val(),
                chkVentaCDeuda: $("#chkVentaCDeuda").is(":checked")
            },
            type    : "POST",
            dataType: "json",
            url     : "Clientes/listCliente/modCliente.php",
            success : function(json) {
                $("#popUpExito").dialog({title: "Modificación de Clientes"});

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("El Cliente: <br>"
                                                 + $("#" + $("#rutClienteMod").val() + "-RazSoc").val() + "<br>ha sido modificado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpMod();
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function elimCliente(rutCliente) {
    $("#rutClienteElim").val(rutCliente);
    $("#nomClienteElim").text($("#" + rutCliente + "-RazSoc").val());
    $("#popUpElim").dialog("open");
}

function elimClienteBD(rutCliente) {
    $.ajax({
        data: {
            rutCliente: rutCliente
        },
        type    : "POST",
        dataType: "json",
        url     : "Clientes/listCliente/elimCliente.php",
        success : function(json) {
            $("#popUpExito").dialog({title: "Eliminación de Clientes"});
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Cliente: <br>" 
                                             + $("#" + rutCliente + "-RazSoc").val() + "<br>ha sido eliminado del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Cliente: <br>" 
                                             + $("#" + rutCliente + "-RazSoc").val() + "<br>tiene pedidos en proceso de pago.");
                $("#popUpExito").dialog("open");
            }
            $("#rutClienteElim").val("");
        },
        error: function() {alert("Error desconocido");}
    });
}
