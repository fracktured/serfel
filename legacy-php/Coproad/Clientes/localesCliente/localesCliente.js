/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();

    $("button").button();
    $("#ingLocalCliente").click(ingLocalCliente);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaLocalClientes").dataTable({
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
                $("#idLocalClienteElim").val("");
            },
            'Eliminar este Local de Cliente': function() {
                elimLocalClienteBD($("#idLocalClienteElim").val());
                $(this).dialog('close');
            }
        }
    });

    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 650,
        heigth: 350,
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar este Local de Cliente': function() {
                modLocalClienteBD();
            }
        }
    });

    $("#popUpExito").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Ok": function() { document.location.href = document.location.href; }
        },
        close: function() { document.location.href = document.location.href; }
    });
});

function ingLocalCliente() {
    $("#nomVendedor").hide();
    $("#cmbVendedor").show();

    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 650,
        heigth: 350,
        title: "Ingreso de Local de Cliente",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nuevo Local de Cliente': function() {
                ingLocalClienteBD();
            }
        }
    });

    $("#popUpIngMod").dialog("open");
}

function ingLocalClienteBD() {
    var errores = false;
    var errorEmail = false;

    if (validaInputVacio("nomLocalCliente")) errores = true;
    if (validaInputVacio("direLocalClie")) errores = true;
    if (validaInputVacio("fonoLocalClie")) errores = true;
    if (validaInputVacio("comuna", "")) errores = true;
    //if(validaInputVacio("nomContacto"))      errores = true;
    //if(validaInputVacio("apellPatContacto")) errores = true;
    //if(validaInputVacio("fonoContacto"))     errores = true;

    if ($("#emailLocalClie").val() != "" && !validaEmail($("#emailLocalClie").val())) {
        $("#emailLocalClie").attr("class", "inputError");
        errorEmail = true;
    } else $("#emailLocalClie").attr("class", "");

    if ($("#emailContacto").val() != "" && !validaEmail($("#emailContacto").val())) {
        $("#emailContacto").attr("class", "inputError");
        errorEmail = true;
    } else $("#emailContacto").attr("class", "");

    if (errores) mensajesPopUpError("vacios");
    else if (errorEmail) mensajesPopUpError("email");
    else {
        $.ajax({
            data: {
                rutCliente: $("#rutCliente").val(),
                nomLocalCliente: $("#nomLocalCliente").val(),
                direLocalClie: $("#direLocalClie").val(),
                fonoLocalClie: $("#fonoLocalClie").val(),
                emailLocalClie: $("#emailLocalClie").val(),
                nomContacto: $("#nomContacto").val(),
                apellPatContacto: $("#apellPatContacto").val(),
                apellMatContacto: $("#apellMatContacto").val(),
                fonoContacto: $("#fonoContacto").val(),
                emailContacto: $("#emailContacto").val(),
                topeVenta: $("#topeVenta").val(),
                topeCredito: $("#topeCredito").val(),
                idVendedor: $("#cmbVendedor").val(),
                idFormaPago: $("#cmbFormaPago").val(),
                comuna: $("#comuna").val(),
                observaciones: $("#observaciones").val(),
                giro: $("#giro").val(),
                chkTopeVenta: $("#chkTopeVenta").is(":checked")
            },
            type: "POST",
            dataType: "json",
            url: "Clientes/localesCliente/ingLocalCliente.php",
            success: function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Local de Clientes" });

                if (json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nuevo Local ingresado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if (json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Local ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                } else if (json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function modLocalCliente(idLocalCliente) {
    $("#cmbVendedor").show();
    $("#nomVendedor").hide();

    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 650,
        heigth: 350,
        title: "Modificar Local de Cliente",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar este Local de Cliente': function() {
                modLocalClienteBD();
            }
        },
        close: function() { document.location.href = document.location.href; }
    });

    $.ajax({
        data: {
            idLocalCliente: idLocalCliente
        },
        type: "POST",
        dataType: "json",
        url: "Clientes/Globales/obtInfoLocalCliente.php",
        success: function(json) {
            $("#idLocalClienteIngMod").val(idLocalCliente);
            $("#nomLocalCliente").val(json.nom_local_cliente);
            $("#direLocalClie").val(json.direccion_local_cliente);
            $("#fonoLocalClie").val(json.telefono_local_cliente);
            $("#emailLocalClie").val(json.email_local_cliente);
            $("#nomContacto").val(json.nom_contacto);
            $("#apellPatContacto").val(json.apell_pat_contacto);
            $("#apellMatContacto").val(json.apell_mat_contacto);
            $("#fonoContacto").val(json.telefono_contacto);
            $("#emailContacto").val(json.email_contacto);
            $("#topeVenta").val(json.tope_venta);
            $("#topeCredito").val(json.tope_credito);
            $("#cmbVendedor option[value = '" + json.id_vendedor + "']").attr("selected", "selected");
            $("#nomVendedor").html($("#cmbVendedor option:selected").text());
            $("#cmbFormaPago option[value = '" + json.id_forma_pago + "']").attr("selected", "selected");
            $("#comuna").val(json.comuna);
            $("#observaciones").val(json.observaciones);
            $("#giro").val(json.giro);

            if (json.permite_venta_tope_mensual == 1) {
                $("#chkTopeVenta").attr("checked", "checked");
            }
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#idLocalClienteIngMod").val("");
    $("#nomLocalCliente").val("");
    $("#direLocalClie").val("");
    $("#fonoLocalClie").val("");
    $("#emailLocalClie").val("");
    $("#nomContacto").val("");
    $("#apellPatContacto").val("");
    $("#apellMatContacto").val("");
    $("#fonoContacto").val("");
    $("#emailContacto").val("");
    $("#topeVenta").val("");
    $("#topeCredito").val("");
    $("#nomVendedor").html("");
    $("#comuna").val("");
    $("#giro").val("");
}

function modLocalClienteBD() {
    var errores = false;
    var errorEmail = false;

    if (validaInputVacio("nomLocalCliente")) errores = true;
    if (validaInputVacio("direLocalClie")) errores = true;
    if (validaInputVacio("fonoLocalClie")) errores = true;
    if (validaInputVacio("comuna", "")) errores = true;
    //if(validaInputVacio("nomContacto"))      errores = true;
    //if(validaInputVacio("apellPatContacto")) errores = true;
    //if(validaInputVacio("fonoContacto"))     errores = true;

    if ($("#emailLocalClie").val() != "" && !validaEmail($("#emailLocalClie").val())) {
        $("#emailLocalClie").attr("class", "inputError");
        errorEmail = true;
    } else $("#emailLocalClie").attr("class", "");

    if ($("#emailContacto").val() != "" && !validaEmail($("#emailContacto").val())) {
        $("#emailContacto").attr("class", "inputError");
        errorEmail = true;
    } else $("#emailContacto").attr("class", "");

    if (errores) mensajesPopUpError("vacios");
    else if (errorEmail) mensajesPopUpError("email");
    else {
        $.ajax({
            data: {
                idLocalCliente: $("#idLocalClienteIngMod").val(),
                rutCliente: $("#rutCliente").val(),
                nomLocalCliente: $("#nomLocalCliente").val(),
                direLocalClie: $("#direLocalClie").val(),
                fonoLocalClie: $("#fonoLocalClie").val(),
                emailLocalClie: $("#emailLocalClie").val(),
                nomContacto: $("#nomContacto").val(),
                apellPatContacto: $("#apellPatContacto").val(),
                apellMatContacto: $("#apellMatContacto").val(),
                fonoContacto: $("#fonoContacto").val(),
                emailContacto: $("#emailContacto").val(),
                topeVenta: $("#topeVenta").val(),
                topeCredito: $("#topeCredito").val(),
                idFormaPago: $("#cmbFormaPago").val(),
                comuna: $("#comuna").val(),
                observaciones: $("#observaciones").val(),
                giro: $("#giro").val(),
                chkTopeVenta: $("#chkTopeVenta").is(":checked")
            },
            type: "POST",
            dataType: "json",
            url: "Clientes/localesCliente/modLocalCliente.php",
            success: function(json) {
                $("#popUpExito").dialog({ title: "Modificar Local de Cliente" });

                if (json.resultado == 1) {
                    $("#popUpExitoMensaje").html("El Local: <br>" +
                        $("#" + $("#idLocalClienteIngMod").val() + "-NomLoc").val() + "<br>ha sido modificado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if (json.resultado == -1) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function elimLocalCliente(idLocalCliente) {
    $("#idLocalClienteElim").val(idLocalCliente);
    $("#nomLocalClienteElim").text($("#" + idLocalCliente + "-NomLoc").val());
    $("#popUpElim").dialog("open");
}

function elimLocalClienteBD(idLocalCliente) {
    $.ajax({
        data: {
            idLocalCliente: idLocalCliente
        },
        type: "POST",
        dataType: "json",
        url: "Clientes/localesCliente/elimLocalCliente.php",
        success: function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Local de Cliente" });

            if (json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Local: <br>" +
                    $("#" + idLocalCliente + "-NomLoc").val() + "<br>ha sido eliminado del Sistema.");
                $("#popUpExito").dialog("open");
            } else if (json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Local: <br>" +
                    $("#" + idLocalCliente + "-NomLoc").val() + "<br>tiene pedidos en proceso de pago.");
                $("#popUpExito").dialog("open");
            }
            $("#idLocalClienteElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}