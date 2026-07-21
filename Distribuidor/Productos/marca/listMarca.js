/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingMarca").click(ingMarca);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    $("#tablaMarca").dataTable({
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
                $("#idMarcaElim").val("");
            },
            'Eliminar Unidad Medida': function() {
                elimMarcaBD($("#idTipoMarcaElim").val());
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
                modMarcaBD();
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

function ingMarca() {

   $("#spanRutEmp").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Ingrese Marca",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Marca': function() {
                ingMarcaBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingMarcaBD() {

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
            url     : "Productos/marca/ingMarca.php",
            success : function(json) {
                $("#popUpExito").dialog({
                    title: "Ingrese Marca"
                });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Marca ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("Marca ya se encuentra ingresada al Sistema.");
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

function modMarca(idMarca) {

     $("#nombre").hide();
    $("#spanNombre").show();
    $("#idMarca").val(idMarca);
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Marca",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Marca': function() {
                modMarcaBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $.ajax({
        data: {
            idMarca:  $("#idMarca").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/Globales/obtInfoMarca.php",
        success : function(json) {
            $("#idMarca").val(idMarca);
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

function modMarcaBD() {
    var errores = false;   
    // Se hacen varios if para q coloree todos los campos con errores

    if(validaInputVacio("descripcion"))     errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idMarca : $("#idMarca").val(),
                descripcion: $("#descripcion").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Productos/marca/modMarca.php",
            success : function(json) {
                $("#popUpExito").dialog({
                    title: "Modificar Tipo Producto"
                });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("Marca: <br>"
                        + $("#" + $("#idMarca").val() + "-Marca").val() + "<br>Ha sido modificada exitosamente.");
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

function elimMarca(idMarca) {
    $("#idMarcaElim").val(idMarca);
    $("#nomMarcaElim").text($("#" + idMarca + "-Marca").val());
    $("#popUpElim").dialog("open");
}

function elimMarcaBD() {
    $.ajax({
        data: {
            idMarca: $("#idMarcaElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/marca/elimMarca.php",
        success : function(json) {

             $("#popUpExito").dialog({ title: "Eliminación de Marca" });

            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Marca: <br>"
                                             + $("#" +  $("#idMarcaElim").val() + "-Marca").val() + "<br>Ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpExitoMensaje").html("La Marca: <br>"
                                             + $("#" +  $("#idMarcaElim").val() + "-Marca").val() + "<br>Tiene Productos Asignados.");
                $("#popUpExito").dialog("open");
            }
            $("#idMarcaElim").val("");

        },
        error: function() {
            alert("Error desconocido");
        }
    });
}