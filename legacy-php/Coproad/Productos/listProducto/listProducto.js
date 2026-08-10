/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();

    $("button").button();
    $("#ingProducto").click(ingProducto);
    $("#codSerfel").numeric();
    $("#maxPorcenDesc").numeric();

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
                $("#idProdElim").val("");
            },
            'Eliminar este Producto': function() {
                elimProductoBD($("#idProdElim").val());
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
        heigth: 300,
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar este Producto': function() {
                modProductoBD();
            }
        }
    });

    $("#popUpExito").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Ok": function() {
                $(this).dialog('close');
                $("#popUpIngMod").dialog('close');
                $("#btnFiltrar").click();
            }
        }
    });
});

function cargarComboUM() {
    var contUM = 0;

    $.ajax({
        type: "POST",
        dataType: "json",
        async: false,
        url: "Productos/Globales/obtListaUnidadMedida.php",
        success: function(json) {
            var option = "";

            $.each(json, function() {
                option += "<option value='" + this.id_UM + "'>" + this.nom_UM + "</option>";

                contUM++;
            });

            $("#cmbUM").append(option);
        },
        error: function() { alert("Error desconocido"); }
    });

    return contUM;
}

function cargarComboMarcas() {
    var contMarca = 0;

    $.ajax({
        type: "POST",
        dataType: "json",
        async: false,
        url: "Productos/Globales/obtListaMarca.php",
        success: function(json) {
            var option = "";

            $.each(json, function() {
                option += "<option value='" + this.id_marca + "'>" + this.nom_marca + "</option>";

                contMarca++;
            });

            $("#cmbMarca").append(option);
        },
        error: function() { alert("Error desconocido"); }
    });

    return contMarca;
}

function cargarComboFamilias(combo, idTipoProducto, soloPadre) {
    var contFamilias = 0;

    $("#" + combo).find("option").remove();

    $.ajax({
        data: {
            familiaPadre: idTipoProducto,
            soloPadre: soloPadre
        },
        type: "POST",
        dataType: "json",
        async: false,
        url: "Productos/Globales/obtListaTiposProducto.php",
        success: function(json) {
            var option = "";

            $.each(json, function() {
                option += "<option value='" + this.id_tipo_producto + "'>" + this.nom_tipo_producto + "</option>";

                contFamilias++;
            });

            $("#" + combo).append(option);
        },
        error: function() { alert("Error desconocido"); }
    });

    return contFamilias;
}

function ingProducto() {
    var contM = 0;
    var contF = 0;
    var contUM = 0;
    var contMarca = 0;
    var contUnidades = 0;
    var contFamiliaPadre = 0;
    var contFamiliaHija = 0;

    $("#codSerfel").val("");
    $("#nomProd").val("");
    $("#maxPorcenDesc").hide();
    $("#descProd").val("");
    $("#codBarra").val("");
    $("#chkEsPorcionado").removeAttr("checked");
    $.each($("#cmbMarca").find("option"), function() { contM++; });
    $.each($("#cmbUM").find("option"), function() { contUM++; });
    $.each($("#cmbFamPadre").find("option"), function() { contF++; });

    if (contM == 0) contMarca = cargarComboMarcas();
    if (contUM == 0) contUnidades = cargarComboUM();
    if (contF == 0) {
        contFamiliaPadre = cargarComboFamilias("cmbFamPadre", 0, 1);
        contFamiliaHija = cargarComboFamilias("cmbFam", $("#cmbFamPadre").val(), 0);
    }

    if (contMarca == 0 && contM == 0) {
        $("#popUpErrorMensaje").html("Deben existir Marcas antes de ingresar un Producto.");
        $("#popUpError").dialog("open");
    } else if (contF == 0 && (contFamiliaPadre == 0 || contFamiliaHija == 0)) {
        $("#popUpErrorMensaje").html("Deben existir Tipos de Producto antes de ingresar un Producto.");
        $("#popUpError").dialog("open");
    } else if (contUnidades == 0 && contUM == 0) {
        $("#popUpErrorMensaje").html("Deben existir Unidades de Medida antes de ingresar un Producto.");
        $("#popUpError").dialog("open");
    } else {
        $("#popUpIngMod").dialog({
            bgiframe: true,
            resizable: false,
            autoOpen: false,
            modal: true,
            width: 650,
            heigth: 300,
            title: "Ingreso de Productos",
            overlay: {
                backgroundColor: '#000',
                opacity: 0.5
            },
            buttons: {
                'Cancelar': function() {
                    $(this).dialog('close');
                    limpiarPopUpIngMod();
                },
                'Ingresar nuevo Producto': function() {
                    ingProductoBD();
                }
            }
        });

        $("#popUpIngMod").dialog("open");
    }
}

function ingProductoBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if (validaInputVacio("nomProd", "")) errores = true;
    if (validaInputVacio("cmbFamPadre", "")) errores = true;

    if (errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                codSerfel: $("#codSerfel").val(),
                nomProd: $("#nomProd").val(),
                idUM: $("#cmbUM").val(),
                idMarca: $("#cmbMarca").val(),
                descProd: $("#descProd").val(),
                codBarra: $("#codBarra").val(),
                idFamPadre: $("#cmbFamPadre").val(),
                idFam: $("#cmbFam").val(),
                idImp: $("#cmbImpuesto").val(),
                esPorcionado: $("#chkEsPorcionado").is(":checked")
            },
            type: "POST",
            dataType: "json",
            url: "Productos/listProducto/ingProducto.php",
            success: function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Productos" });

                if (json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nuevo Producto ingresado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if (json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Producto ya se encuentra ingresado al Sistema.");
                    $("#popUpError").dialog("open");
                } else if (json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                } else if (json.resultado == -3) {
                    $("#popUpErrorMensaje").html("El Código Serfel ya se encuentra asociado a otro Producto.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function modProducto(idProducto) {
    var contM = 0;
    var contF = 0;
    var contUM = 0;

    $("#maxPorcenDesc").show();
    $.each($("#cmbMarca").find("option"), function() { contM++; });
    $.each($("#cmbUM").find("option"), function() { contUM++; });
    $.each($("#cmbFamPadre").find("option"), function() { contF++; });

    if (contM == 0) cargarComboMarcas();
    if (contUM == 0) contUnidades = cargarComboUM();
    if (contF == 0) {
        cargarComboFamilias("cmbFamPadre", 0, 1);
        cargarComboFamilias("cmbFam", $("#cmbFamPadre").val(), 0);
    }

    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 650,
        heigth: 300,
        title: "Modificar Producto",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Modificar este Producto': function() {
                modProductoBD();
            }
        }
    });

    $.ajax({
        data: {
            idProducto: idProducto
        },
        type: "POST",
        dataType: "json",
        url: "Productos/Globales/obtInfoProducto.php",
        success: function(json) {
            $("#idProdIngMod").val(idProducto);
            $("#codSerfel").val(json.codSerfel);
            $("#nomProd").val(json.nomProd);
            $("#cmbUM option[value = '" + json.idUM + "']").attr("selected", "selected");
            $("#cmbMarca option[value = '" + json.idMarca + "']").attr("selected", "selected");
            $("#maxPorcenDesc").val(json.maxPorDesc);
            $("#descProd").val(json.descProd);
            $("#codBarra").val(json.codBarra);
            //$("#cmbFamPadre")
            $("#cmbFam option[value = '" + json.idTipoProd + "']").attr("selected", "selected");
            $("#cmbImpuesto option[value = '" + json.idImp + "']").attr("selected", "selected");

            if ( json.usa_porciones == 1 ) {
                $("#chkEsPorcionado").attr("checked", "checked");
            } else {
                $("#chkEsPorcionado").removeAttr("checked");
            }
        },
        error: function() { alert("Error desconocido"); }
    });

    $("#popUpIngMod").dialog("open");
}

function limpiarPopUpIngMod() {
    $("#idProdIngMod").val("");
    $("#nomProd").val("");
    $("#descProd").val("");
    $("#codBarra").val("");
    $("#chkEsPorcionado").removeAttr("checked");
}

function modProductoBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if (validaInputVacio("nomProd", "")) errores = true;
    if (validaInputVacio("cmbFamPadre", "")) errores = true;

    if (errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idProd: $("#idProdIngMod").val(),
                codSerfel: $("#codSerfel").val(),
                nomProd: $("#nomProd").val(),
                idUM: $("#cmbUM").val(),
                idMarca: $("#cmbMarca").val(),
                maxPorcen: $("#maxPorcenDesc").val(),
                descProd: $("#descProd").val(),
                codBarra: $("#codBarra").val(),
                idFamPadre: $("#cmbFamPadre").val(),
                idFam: $("#cmbFam").val(),
                idImp: $("#cmbImpuesto").val(),
                esPorcionado: $("#chkEsPorcionado").is(":checked")
            },
            type: "POST",
            dataType: "json",
            url: "Productos/listProducto/modProducto.php",
            success: function(json) {
                //$("#popUpExito").dialog({title: "Modificar Producto"});

                if (json.resultado == 1) {
                    $("#popUpExitoMensaje").html("El Producto: <br>" +
                        $("#" + $("#idProdIngMod").val() + "-NomProd").val() + "<br>ha sido modificado exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if (json.resultado == -1) {
                    $("#popUpErrorMensaje").html("El Nombre ya se encuentra asociado a otro Producto.");
                    $("#popUpError").dialog("open");
                } else if (json.resultado == -3) {
                    $("#popUpErrorMensaje").html("El Código Serfel ya se encuentra asociado a otro Producto.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function elimProducto(idProducto) {
    $("#idProdElim").val(idProducto);
    $("#nomProdElim").text($("#" + idProducto + "-NomProd").val());
    $("#popUpElim").dialog("open");
}

function elimProductoBD(idProducto) {
    $.ajax({
        data: {
            idProducto: idProducto
        },
        type: "POST",
        dataType: "json",
        url: "Productos/listProducto/elimProducto.php",
        success: function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Productos" });

            if (json.resultado == 1) {
                $("#popUpExitoMensaje").html("El Producto: <br>" +
                    $("#" + idProducto + "-NomProd").val() + "<br>ha sido eliminado del Sistema.");
                $("#popUpExito").dialog("open");
            } else if (json.resultado == -1) {
                $("#popUpExitoMensaje").html("El Producto: <br>" +
                    $("#" + idProducto + "-NomProd").val() + "<br>tiene stock aún.");
                $("#popUpExito").dialog("open");
            }
            $("#idProdElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}