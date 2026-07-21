/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("#datosVenta").hide();
    $("#filaAnular").hide();
    
    $("button").button();
    
    $("#numFactura").numeric();
    
    $("#aceptarNumFactura").button();
    $("#aceptarNumFactura").click(aceptarNumFactura);
    
    $("#anularVenta").button();
    $("#anularVenta").click(anularVenta);
    
    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            'Ok': function() { 
                $(this).dialog('close');
            }
        }
    });
    
    $("#popUpElim").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 500,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
	buttons: {
            'Cancelar': function() { 
                $(this).dialog('close'); 
            },
            'Anular Venta': function() {
                anularVentaBD($("#idVenta").val());
		$(this).dialog('close');
            },
            'Eliminar Venta': function() {
                eliminarVentaBD($("#idVenta").val());
		$(this).dialog('close');
            }
	}
    });
    
});

function aceptarNumFactura() {
    if($("#numFactura").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Número de Factura para continuar.");
        $("#popUpError").dialog("open");
    } else {
        var numFactura = parseInt($("#numFactura").val());
        $("#numFactura").val(numFactura);
        
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/Globales/obtInfoVenta.php",
            data    : {
                rutEmpresa: $("#cmbEmpresa").val(),
                numFactura: numFactura
            },
            success: function(json) {
                if(json.resultado == 1) {
                    $("#popUpBuscarProdFiltro").val("prodVenta");
                    $("#popUpBuscarProdId").val(json.idVenta);
                    
                    $("#idVenta").val(json.idVenta);
                    $("#rutEmpresa").val($("#cmbEmpresa").val());
                    $("#spanNumFactura").html(numFactura);
                    $("#fechaVenta").html(json.fechaVenta);
                    $("#nomVendedor").html(json.nomVendedor);
                    $("#datosCliente").html(json.rutCompletoCliente + " " + json.razonSocialCliente);
                    $("#datosLocalCliente").html(json.nomLocalCliente + " " + json.dirLocalCliente);
                    $("#nomFormaPago").html(json.nomFormaPago);
                    $("#datosEmpresa").html(json.rutCompletoEmpresa + " " + json.razonSocialEmpresa);
                    $("#filaTotalesNumFactura").html(numFactura);
                    $("#numNotaCredito").val(json.numNotaCredito)
                    
                    $("#spanPrecioTotal").html("$ " + json.precioTotal);
                    
                    $("#datosFactura").hide();
                    $("#datosVenta").show();
                    $("#filaAnular").show();

                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("No se encuentra Venta registrada para esa Empresa y ese Número de Factura.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function anularVenta() {
    $("#popUpElim").dialog("open");
}

function anularVentaBD(idVenta) {
    $.ajax({
        data: {
            idVenta: idVenta
        },
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Venta/ajaxAnularVenta.php",
        success : function(oJson) {
            puCrearDialogPopUp(oJson);

            $("#popUp").dialog({title: "Anular Venta"});
            $("#popUpMsg").html(oJson.cMensaje);
            $("#popUp").dialog("open");
        },
        error: function(xhr, status, error) {
            var err = JSON.parse(xhr.responseText);
            alert("anulacionVenta:anularVentaBD \n " + err.Message);
        }
    });
}

function eliminarVentaBD(idVenta) {
    $.ajax({
        data: {
            idVenta: idVenta
        },
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Venta/ajaxEliminarVenta.php",
        success : function(oJson) {
            puCrearDialogPopUp(oJson);

            $("#popUp").dialog({title: "Eliminar Venta"});
            $("#popUpMsg").html(oJson.cMensaje);
            $("#popUp").dialog("open");
        },
        error: function(xhr, status, error) {
            var err = JSON.parse(xhr.responseText);
            alert("anulacionVenta:anularVentaBD \n " + err.Message);
        }
    });
}