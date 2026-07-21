/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 12/08/2010                             */
/*************************************************/

$(document).ready(function() {
    iniPopUpError();
    $("button").button();
});

function desplegarExistencias() {
    $("#detalleExistencias").find("fieldset").remove();
    $("#detalleExistencias").find("br").remove();
    
    if(!$("#stockCritico").attr("checked")) {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Stock/listExistencias/desplegarExistenciasBodega.php",

            data: {
                idBodega: $("#cmbListaBodegas").val()
            },
            success: function(json) {
                var fieldSet;
                var idBodegaAnt = 0;

                $.each(json, function() {
                    if(idBodegaAnt != this.id_bodega) {
                        fieldSet = "<fieldset id='fieldSetBodega" + this.id_bodega + "' style='padding: 15px'>" +
                                    "<legend>" + this.nom_bodega + "</legend>" +
                                    "<table style='width: 98%'>" +
                                        "<tr>" +
                                            "<td class='tituloClick'>" +
                                                "<button id='btnMostrarBodega" + this.id_bodega + "' " +
                                                        "onclick='javascript:desplegarExistenciasFamilia(" + this.id_bodega + ", 0, 1)'>" + 
                                                    "Mostrar" + 
                                                "</button></td>" +
                                            "<td class='totalProductos'>Total de Productos : " + this.cantidad + "</td>" +
                                            "<td class='totalCosto'>Costo Promedio Total: <br />" + this.costo_prom + "</td>" +
                                        "</tr>" +
                                    "</table>" +
                                    "<div id='popBodega" + this.id_bodega + "'></div>" +
                                "</fieldset>" +
                                "<br />";

                        $("#detalleExistencias").append(fieldSet);
                        $("#popBodega" + this.id_bodega).hide();
                        idBodegaAnt = this.id_bodega;
                    }
                });
            },
            error: function() {alert("Error desconocido");}
        });
    } else if($("#cmbListaBodegas").val() == -1) {
        $("#popUpErrorMensaje").html("La Lista de Existencias por Stock Crítico no se puede desplegar para todas las Bodegas a la vez.");
        $("#popUpError").dialog("open");
    } else {
        var tabla = "";
        
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Stock/listExistencias/desplegarExistenciasBodegaFamiliaProductoCritico.php",

            data: {
                idBodega : $("#cmbListaBodegas").val()
            },
            success: function(json) {
                tabla = "<fieldset id='fieldSetBodega" + $("#cmbListaBodegas").val() + "' style='padding: 15px'>" +
                            "<legend>" + $("#cmbListaBodegas option[selected]").text() + "</legend>" +
                            "<table id='bodega" + $("#cmbListaBodegas").val() + "' class='display' align='center'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>N</th>" +
                                    "<th>Nombre Producto</th>" +
                                    "<th>UM</th>" +
                                    "<th>Costo Unit</th>" +
                                    "<th>Cantidad</th>" +
                                    "<th>Costo Total</th>" +
                                    "<th>Ult Compra</th>" +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";
                $.each(json, function() {
                       tabla += "<tr style='background-color: " + this.color + ";'>" +
                                    "<td>" + this.id_producto       + "</td>" +
                                    "<td>" + this.nom_producto      + "</td>" +
                                    "<td align='center'>" + this.nom_UM            + "</td>" +
                                    "<td align='right'>"  + this.costo_prom_unidad + "</td>" +
                                    "<td align='right'>"  + this.cantidad          + "</td>" +
                                    "<td align='right'>"  + this.costo_prom_total  + "</td>" +
                                    "<td align='center'>" + this.ultima_compra     + "</td>" +
                                "</tr>";
                });

                tabla +=    "</tbody>" +
                        "</table>";
                
                $("#detalleExistencias").append(tabla);
                
                $("#bodega" + $("#cmbListaBodegas").val()).dataTable({
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
}

function desplegarExistenciasFamilia(idBodega, idFamiliaClick, nivel) {
    var cont = 0;

    if(nivel == 1) {
        $.each($("#popBodega" + idBodega).find("table"), function() {
            cont++;
        });
    } else {
        $.each($("#popBodega" + idBodega + "Familia" + idFamiliaClick).find("table"), function() {
            cont++;
        });
    }

    if(cont == 0) {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Stock/listExistencias/desplegarExistenciasBodegaFamilia.php",

            data: {
                idBodega : idBodega,
                idFamilia: idFamiliaClick,
                nivel    : nivel
            },
            success: function(json) {
                var fila, clase;
                
                if(json == "") {
                    desplegarProductos(idBodega, idFamiliaClick);
                } else {
                    $.each(json, function() {
                        if(nivel == 1) clase = "Familia";
                        else clase = "SubFamilia";
                        
                        fila = "<table id='Bodega" + idBodega + "Familia" + this.id_tipo_prod + "' width=98%>" +
                                   "<tr>" +
                                       "<td class='ver' onclick='javascript:desplegarExistenciasFamilia(" + idBodega + ", " +
                                                                                                            this.id_tipo_prod + ", " +
                                                                                                            (nivel + 1) + ")'></td>" +
                                       "<td class='titulo" + clase + "'>"         + this.nom_tipo_prod      + "</td>" +
                                       "<td class='totalProductos" + clase + "'>" + this.cantidad       + "</td>" +
                                       "<td class='totalCosto" + clase + "'>"     + this.costo_prom + "</td>" +
                                   "</tr>" +
                               "</table>" +
                               "<div id='popBodega" + idBodega + "Familia" + this.id_tipo_prod + "' class='paddingLeft20'></div>";

                        if(nivel == 1) {
                            $("#popBodega" + idBodega).append(fila);
                        } else {
                            $("#popBodega" + idBodega + "Familia" + idFamiliaClick).append(fila);
                        }
                        
                        $("#popBodega" + idBodega + "Familia" + this.id_tipo_prod).hide();
                    });
                }
            }
        });
    }

    if(nivel == 1) mostrarOcultarDetalles("popBodega" + idBodega);
    else mostrarOcultarDetalles("popBodega" + idBodega + "Familia" + idFamiliaClick);
}

function mostrarOcultarDetalles(elemento) {
    if($("#" + elemento).is(':visible')) {
        $("#btnMostrarBodega" + elemento).html("Mostrar");
        $("#" + elemento).hide("slow");
    } else {
        $("#" + elemento).show("slow");
        $("#btnMostrarBodega" + elemento).html("Ocultar");
    }
}

function desplegarProductos(idBodega, idFamiliaClick) {
    var cont = 0;
    var tabla = "";

    $.each($("#popBodega" + idBodega + "Familia" + idFamiliaClick).find("table"), function() {
        cont++;
    });

    if(cont == 0) {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Stock/listExistencias/desplegarExistenciasBodegaFamiliaProducto.php",

            data: {
                idBodega : idBodega,
                idFamilia: idFamiliaClick
            },
            success: function(json) {
                tabla = "<table id='bodega" + idBodega + "familia" + idFamiliaClick + "' class='display' align='center'>" +
                        "<thead>" +
                            "<tr>" +
                                "<th>N</th>" +
                                "<th>Nombre Producto</th>" +
                                "<th>UM</th>" +
                                "<th>Costo Unit</th>" +
                                "<th>Cantidad</th>" +
                                "<th>Costo Total</th>" +
                                "<th>Ult Compra</th>" +
                            "</tr>" +
                        "</thead>" +
                        "<tbody>";
                $.each(json, function() {
                       tabla += "<tr style='background-color: " + this.color + "'>" +
                                    "<td>" + this.id_producto       + "</td>" +
                                    "<td>" + this.nom_producto      + "</td>" +
                                    "<td align='center'>" + this.nom_UM            + "</td>" +
                                    "<td align='right'>"  + this.costo_prom_unidad + "</td>" +
                                    "<td align='right'>"  + this.cantidad          + "</td>" +
                                    "<td align='right'>"  + this.costo_prom_total  + "</td>" +
                                    "<td align='center'>" + this.ultima_compra     + "</td>" +
                                "</tr>";
                });

                tabla +=    "</tbody>" +
                        "</table>";
                
                $("#popBodega" + idBodega + "Familia" + idFamiliaClick).attr("class", "");
                $("#popBodega" + idBodega + "Familia" + idFamiliaClick).append(tabla);
                
                $("#bodega" + idBodega + "familia" + idFamiliaClick).dataTable({
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
}