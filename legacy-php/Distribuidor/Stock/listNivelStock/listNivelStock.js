/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de lista de niveles de        *
 *        stock                                             *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    iniPopUpBuscarProducto();
    
    $("button").button();
    $("#minimo").numeric("");
    $("#puntoOrden").numeric("");
    $("#meses").numeric("");
    
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
                $("#idProdElim").val("");
                $("#idBodElim").val("");
            },
            'Eliminar esta Alerta de Stock': function() {
                elimNivelStockBD();
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
            'Modificar esta Alerta de Stock': function() {
                modNivelStockBD();
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

function despNivelStock() {
    $("#detalleNivelStock").find("div").remove();
    $("#detalleNivelStock").find("br").remove();
    $("#detalleNivelStock").find("button").remove();
    $("#idBodegaMod").val($("#cmbListaBodegas").val());

    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Stock/listNivelStock/desplegarNivelesProducto.php",
        data: {
            idBodega : $("#cmbListaBodegas").val()
        },
        success: function(json) {
            var tabla = "<button id='ingNivelStock'>Ingresar Nueva Alerta de Stock</button>" +
                        "<br /><br />" +
                        "<table id='nivelesStock' class='display' align='center'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>N</th>" +
                                    "<th>Nombre Producto</th>" +
                                    "<th>Familia</th>" +
                                    "<th>UM</th>" +
                                    "<th>Mínimo</th>" +
                                    "<th>Punto Orden</th>" +
                                    "<th>Meses</th>" +
                                    "<th>M</th>" +
                                    "<th>E</th>" +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";
            $.each(json, function() {
                tabla +=    "<tr>" +
                                "<td>" + this.id_producto       + "</td>" +
                                "<td>" + this.nom_producto      + "</td>" +
                                "<td>" + this.nom_familia       + "</td>" +
                                "<td align='center'>" + this.nom_UM + "</td>" +
                                "<td align='center'>" + this.minimo + "</td>" +
                                "<td align='center'>" + this.punto_orden + "</td>" +
                                "<td align='center'>" + this.meses       + "</td>" +
                                "<td class='linkMod'>" +
                                    "<a class='linkMod' href='javascript:modNivelStock(" + this.id_producto + ")' " +
                                                       "title='Modificar'></a></td>" +
                                "<td class='linkElim'>" +
                                    "<a class='linkElim' href='javascript:elimNivelStock(" + this.id_producto + ")' " +
                                                       "title='Eliminar'></a></td>" +
                            "</tr>";
            });

            tabla +=    "</tbody>" +
                    "</table>";
                
            $("#detalleNivelStock").append(tabla);
            
            $("button").button();
            $("#ingNivelStock").click(mostrarPopUpBuscarProducto);
                
            $("#nivelesStock").dataTable({
                "bJQueryUI": true,
                "sPaginationType": "full_numbers",
                "bLengthChange": true,
                "bFilter": true,
                "bSort": true,
                "bInfo": false,
                "bAutoWidth": false,
                "oLanguage": {
                    "sLengthMenu": "Mostrando _MENU_ resultados por página",
                    "sZeroRecords": "No se han encontrado resultados",
                    "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
                    "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
                    "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
                    "sSearch": "Buscar"
                }
            });
        }
    });
}

function popUpBuscarProductoSelecProd(idProducto) {
    $("#popUpBuscarProducto").dialog("close");
    ingNivelStock(idProducto);
}

function ingNivelStock(idProducto) {
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso de Alertas de Stock",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Alerta de Stock': function() {
                ingNivelStockBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $.ajax({
        data: {
            idProducto: idProducto
        },
        type    : "POST",
        dataType: "json",
        async   : false,
        url     : "Productos/Globales/obtInfoProducto.php",
        success : function(json) {
            $("#idProductoMod").val(idProducto);
            $("#spanNomProductoMod").html(json.nomProd);
        },
        error: function() { alert("Error desconocido"); }
    });
    
    $.ajax({
        data: {
            idBodega: $("#idBodegaMod").val()
        },
        type    : "POST",
        dataType: "json",
        async   : false,
        url     : "Stock/Globales/obtInfoBodega.php",
        success : function(json) {
            $("#spanNomBodegaMod").html(json.nombre);
        },
        error: function() { alert("Error desconocido"); }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingNivelStockBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("minimo", ""))     errores = true;
    if(validaInputVacio("puntoOrden", "")) errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idBodega  : $("#idBodegaMod").val(),
                idProducto: $("#idProductoMod").val(),
                minimo    : $("#minimo").val(),
                puntoOrden: $("#puntoOrden").val(),
                meses     : $("#meses").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Stock/listNivelStock/ingNivelStock.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Alertas de Stock" });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nueva Alerta de Stock ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("La Alerta de Stock ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function modNivelStock(idProducto) {
    $("#idProductoMod").val(idProducto);
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Modificar Alertas de Stock",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar esta Alerta de Stock': function() {
                modNivelStockBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $.ajax({
        data: {
            idProducto: idProducto,
            idBodega  : $("#idBodegaMod").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/Globales/obtInfoNivelStock.php",
        success : function(json) {
            $("#spanNomBodegaMod").html(json.nom_bodega);
            $("#spanNomProductoMod").html(json.nom_producto);
            $("#minimo").val(json.minimo);
            $("#puntoOrden").val(json.punto_orden);
            $("#meses").val(json.meses);
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#spanNomBodegaMod").html("");
    $("#spanNomProductoMod").html("");
    $("#minimo").val("");
    $("#puntoOrden").val("");
    $("#meses").val("");
}

function modNivelStockBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("minimo", ""))     errores = true;
    if(validaInputVacio("puntoOrden", "")) errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idBodega  : $("#idBodegaMod").val(),
                idProducto: $("#idProductoMod").val(),
                minimo    : $("#minimo").val(),
                puntoOrden: $("#puntoOrden").val(),
                meses     : $("#meses").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Stock/listNivelStock/modNivelStock.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Modificar Alerta de Stock" });

                if(json.resultado == 1) {
                    $("#popUpExitoMensaje").html("La Alerta de Stock ha sido modificada exitosamente.");
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

function elimNivelStock(idProducto) {
    $("#idProdElim").val(idProducto);
    $("#idBodElim").val($("#idBodegaMod").val());
    $("#popUpElim").dialog("open");
}

function elimNivelStockBD() {
    $.ajax({
        data: {
            idProducto: $("#idProdElim").val(),
            idBodega  : $("#idBodElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/listNivelStock/elimNivelStock.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Alertas de Stock" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Alerta de Stock ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            }
            $("#idProdElim").val("");
            $("#idBodElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}