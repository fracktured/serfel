/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-12-2011                                        *
 * Desc : Funciones de pagina de lista de usuarios          *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    iniPopUpExito(),
    
    $("#tablaVentas").dataTable({
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
                $("#idVentaAnul").val("");
            },
            'Anular Venta': function() {
                anularVentaBD($("#idVentaAnul").val());
		$(this).dialog('close');
            }
	}
    });
});

function anularVenta(idVenta) {
    $("#idVentaAnul").val(idVenta);
    
    $("#popUpElim").dialog("open");
}

function anularVentaBD(idVenta) {
    $.ajax({
        data: {
            idVenta: idVenta
        },
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Venta/anularVenta.php",
        success : function(json) {
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Venta ha sido anulada.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == -1) {
                $("#popUpErrorMensaje").html("La Venta no puede ser anulada porque ya fue entregada.");
                $("#popUpError").dialog("open");
            }
            $("#idVentaAnul").val("");
        },
        error: function() {alert("Error desconocido");}
    });
}

function verPDFNotaCredito(idNotaCredito) {
    window.open("NotaCreditoElectronica/verPDF.php?idNotaCredito=" + idNotaCredito);
}

function crearNotaCreditoElectronica(idNotaCredito) {
    //setTimeout(recargarPagina, 5000);
    window.open("NotaCreditoElectronica/crearNotaCreditoElectronica.php?idNotaCredito=" + idNotaCredito);
}

function verPDFNotaDebito(idNotaDebito) {
    window.open("NotaDebitoElectronica/verPDF.php?idNotaDebito=" + idNotaDebito);
}

function crearNotaDebitoElectronica(idNotaCredito) {
    //setTimeout(recargarPagina, 5000);
    window.open("NotaDebitoElectronica/crearNotaDebitoElectronica.php?idNotaDebito=" + idNotaDebito);
}