/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingTipoProducto").click(ingTipoProducto);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaProductos").dataTable({
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
                $("#idTipoProductoElim").val("");
            },
            'Eliminar Tipo Producto': function() {
                elimTipoProductoBD($("#idTipoProductoElim").val());
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
            'Modificar Tipo de Producto': function() {
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

function ingTipoProducto() {
    $("#spanRutEmp").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso Tipo Producto",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Tipo Producto': function() {
                ingTipoProductoBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingTipoProductoBD() {
    var rut        = new Array();
    var errores    = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("nombre")) errores = true;
    if(validaInputVacio("descripcion")) errores = true;

    if(errores)       mensajesPopUpError("vacios");

    else {
        $.ajax({
            data: {
                nombre : $("#nombre").val(),
                descripcion : $("#descripcion").val(),
                nivel1 : $("#nivel1").val()

            },
            type    : "POST",
            dataType: "json",
            url     : "Productos/tipoProducto/ingTipoProducto.php",
            success : function(json) {
                $("#popUpExito").dialog({
                    title: "Ingreso Tipo Producto"
                });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Tipo Producto ingresado exitosamente.");
                    $("#popUpExito").dialog("open");
                    limpiarPopUpIngMod();
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("Tipo Producto ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                    limpiarPopUpIngMod();
                }               
            },
            error: function() {
                alert("Error desconocido");
            }
        });
    }
}

function modTipoProducto(idTipoProducto) {

    $("#nombre").hide();
    $("#spanNombre").show();
    $("#idTipoProducto").val(idTipoProducto);
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Tipo Producto",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Tipo de Producto': function() {
                modTipoProductoBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $.ajax({
        data: {
            idTipoProducto:  $("#idTipoProducto").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/Globales/obtInfoTipoProducto.php",
        success : function(json) {
            $("#idTipoProducto").val(idTipoProducto);
            $("#spanNombre").html(json.nombre);
            $("#descripcion").val(json.descripcion);
            if(json.nivel1==idTipoProducto){
                $("#nivel1").val(0);
            }else{
                $("#nivel1").val(json.nivel1);
            }
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

function modTipoProductoBD() {
    var errores = false;

    if(validaInputVacio("descripcion")) errores = true;

    if(errores)       mensajesPopUpError("vacios");
    else{
        $("#nivel1").val()
        if($("#nivel1").val()==$("#idTipoProducto").val()){
            alert("No se puede eligir asi mismo");
        }else{
            $.ajax({
                data: {
                    idTipoProducto : $("#idTipoProducto").val(),
                    descripcion: $("#descripcion").val(),
                    nivel1: $("#nivel1").val()
                },
                type    : "POST",
                dataType: "json",
                url     : "Productos/tipoProducto/modTipoProducto.php",
                success : function(json) {
                    $("#popUpExito").dialog({
                        title: "Modificar Tipo Producto"
                    });

                    if(json.resultado == 1) {
                        $("#popUpExitoMensaje").html("Tipo Producto: <br>"
                            + $("#" + $("#idTipoProducto").val() + "-TipProd").val() + "<br>Ha sido modificada exitosamente.");
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
}

function elimProducto(idTipoProducto) {
    $("#idTipoProductoElim").val(idTipoProducto);
    $("#nomProductoElim").text($("#" + idTipoProducto + "-TipProd").val());
    $("#popUpElim").dialog("open");
}

function elimTipoProductoBD(idTipoProducto) {
    $.ajax({
        data: {
            idTipoProducto: $("#idTipoProductoElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/tipoProducto/elimTipoProducto.php",
        success : function(json) {

            $("#popUpExito").dialog({
                title: "Eliminación de Tipo Producto"
            });

            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Tipo de Producto: <br>"
                    + $("#" + idTipoProducto + "-TipProd").val() + "<br>Ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Tipo de Productos: <br>"
                    + $("#" + idTipoProducto + "-TipProd").val() + "<br>Tiene Productos Asignados.");
                $("#popUpExito").dialog("open");
            }else if(json.resultado == -2) {
                $("#popUpExitoMensaje").html("El Tipo de Productos: <br>"
                    + $("#" + idTipoProducto + "-TipProd").val() + "<br>Tiene Sub Familia Asignada.");
                $("#popUpExito").dialog("open");
            }
            $("#idTipoProductoElim").val("");

        },
        error: function() {
            alert("Error desconocido");
        }
    });
}