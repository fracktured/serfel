/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingUnidadMedida").click(ingUnidadMedida);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaUnidadMedida").dataTable({
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
                $("#idUnidadMedidaElim").val("");
            },
            'Eliminar Unidad Medida': function() {
                elimUnidadMedidaBD($("#idTipoUnidadMedidaElim").val());
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
            'Modificar Unidad Medida': function() {
                modTipoProductoBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {
                document.location.href = document.location.href;
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
});

function ingUnidadMedida() {

   $("#spanRutEmp").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso Unidad Medida",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Unidad Medida': function() {
                ingUnidadMedidaBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingUnidadMedidaBD() {

    var errores    = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("nombre")) errores = true;
    if(validaInputVacio("descripcion")) errores = true;

    if(errores)       mensajesPopUpError("vacios");

    else {
        $.ajax({
            data: {
                nombre : $("#nombre").val(),
                descripcion : $("#descripcion").val()

            },
            type    : "POST",
            dataType: "json",
            url     : "Productos/unidadMedida/ingUnidadMedida.php",
            success : function(json) {
                $("#popUpExito").dialog({
                    title: "Ingreso Unidad Medida"
                });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Unidad Medida ingresado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("Unidad Medida ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() {
                alert("Error desconocido");
            }
        });
    }
}

function modUnidadMedida(idUnidadMedida) {

     $("#nombre").hide();
    $("#spanNombre").show();
    $("#idUnidadMedida").val(idUnidadMedida);
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Unidad Medida",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Unidad Medida': function() {
                modUnidadMedidaBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $.ajax({
        data: {
            idUnidadMedida:  $("#idUnidadMedida").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/Globales/obtInfoUnidadMedida.php",
        success : function(json) {
            $("#idUnidadMedida").val(idUnidadMedida);
            $("#spanNombre").html(json.nombre);
            $("#descripcion").val(json.descripcion);
                   },
        error: function() {
            alert("Error desconocido");
        }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#nombre").val("");
    $("#descripcion").val("");
    $("#nivel1").val("");
    $("#nivel2").val("");
}

function modUnidadMedidaBD() {
    var errores = false;   
    // Se hacen varios if para q coloree todos los campos con errores

    if(validaInputVacio("descripcion"))     errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idUnidadMedida : $("#idUnidadMedida").val(),
                descripcion: $("#descripcion").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Productos/unidadMedida/modUnidadMedida.php",
            success : function(json) {
                $("#popUpExito").dialog({
                    title: "Modificar Tipo Producto"
                });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("Unidad Medida: <br>"
                        + $("#" + $("#idUnidadMedida").val() + "-UnMe").val() + "<br>Ha sido modificada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == -1) {
                    mensajesPopUpError(json.tipoError);
                }
                limpiarPopUpIngMod();
            },
            error: function() {
                alert("Error desconocido");
            }
        });
    
}
}

function elimUnidadMedida(idUnidadMedida) {
    $("#idUnidadMedidaElim").val(idUnidadMedida);
    $("#nomUnidadMedidaElim").text($("#" + idUnidadMedida + "-UnMe").val());
    $("#popUpElim").dialog("open");
}

function elimUnidadMedidaBD() {
    $.ajax({
        data: {
            idUnidadMedida: $("#idUnidadMedidaElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/unidadMedida/elimUnidadMedida.php",
        success : function(json) {

             $("#popUpExito").dialog({ title: "Eliminación de Unidad Medida" });

            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Unidad Medida: <br>"
                                             + $("#" +  $("#idUnidadMedidaElim").val() + "-UnMe").val() + "<br>Ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Unidad Medida: <br>"
                                             + $("#" +  $("#idUnidadMedidaElim").val() + "-UnMe").val() + "<br>Tiene Productos Asignados.");
                $("#popUpExito").dialog("open");
            }
            $("#idUnidadMedidaElim").val("");

        },
        error: function() {
            alert("Error desconocido");
        }
    });
}