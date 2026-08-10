/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#ingBodega").click(ingBodega);
    //$("#sitetite").click(function() { location.href = obtPaginaInicio() })
    
    $("#fecDoc").datepicker({
        changeMonth: true,
        changeYear : true,
        yearRange  : '1980:2060',
        altFormat  : 'dd-mm-yy'
    });
    
    $("#tablaBodegas").dataTable({
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
    
    $("#popRecepcion").dialog({
        autoOpen: false,
        modal   : true,
        width: 800,
        buttons : {
            "Ok": function() {
                $("#popRecepcion").dialog("close");
            }
        }
    }); 
    
    $("#popPago").dialog({
        autoOpen: false,
        modal   : true,
        width: 800,
        buttons : {
            "Ok": function() {
                $("#popPago").dialog("close");
            }
        }
    }); 
    
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
    
});

function ingBodega() {
    $("#spanRutEmp").hide();
    $("#rut").show();
    
    $("#popUpIngMod").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso Bodega",
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Bodega': function() {
                ingBodegaBD();
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpIngMod").dialog("open");
}

function detRecepcion(idRecepcion) {

    $.ajax({
        data: {
            idRecepcion:  idRecepcion
        },
        async   : false,
        type    : "POST",
        dataType: "json",
        url     : "Stock/Globales/obtInfoRecepcion.php",
        success : function(json) {
            
            $("#popRecepcion").dialog({
                title: "Detalle Recepcion"
            });
            
            $("#popRecepcion").dialog("open");
            
            $("#razonSocial").html(json.razonSocial);
            $("#rutCompleto").html(json.rutCompleto);
            $("#fechaEmisionDocto").html(convertirAFechaJS(json.fechaEmisionDocto));
            $("#nomTipoDocto").html(json.nomTipoDocto);
            $("#numDocto").html(json.numDocto);
            $("#nomBodega").html(json.nomBodega);
            if(json.idTipoPago==0){
                $("#nomTipoPago").html("Sin Pago");
            }else{
                $("#nomTipoPago").html(json.nomTipoPago);
            }           
            $("#observacion").html(json.observacion);

        },
        error: function() {
            alert("Error desconocido 1");
        }
    });
    
    $.ajax({
        data: {
            idRecepcion:  idRecepcion
        },
        type    : "POST",
        dataType: "json",
        async   : false,
        url     : "Stock/Globales/obtListaProductosRecepcion.php",
        success : function(json) {
            
            $("#tablaProductos").find("tbody").remove();
             
            $.each(json, function() {     
                
                $("#tablaProductos").append("<tbody> <tr>" +
                    "<td style='text-align:right'>" + this.idProducto +"</td>" +
                    "<td style='text-align:left'>" + this.nomProducto +"</td>" +
                    "<td style='text-align:left'> "+ this.nomMarca +" </td>" +    
                    "<td style='text-align:left'>" + this.NomUM + "</td>" +
                    "<td style='text-align:right'> "+ this.Cantidad +" </td>" +    
                    "<td style='text-align:right'> "+ this.Valor +" </td>" +    
                    "</tr> </tbody>");
        
            });

          
        },
        error: function() {
            alert("Error desconocido 2");
        }
    });

    $("#popRecepcion").dialog("open");

}

function ingPago(idRecepcion) {

    $.ajax({
        data: {
            idRecepcion:  idRecepcion
        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/Globales/obtInfoRecepcion.php",
        success : function(json) {     
            
            $("#razonSocialPago").html(json.razonSocial);
            $("#rutCompletoPago").html(json.rutCompleto);
            $("#fechaEmisionDoctoPago").html(convertirAFechaJS(json.fechaEmisionDocto));
            $("#nomTipoDoctoPago").html(json.nomTipoDocto);
            $("#numDoctoPago").html(json.numDocto);
            $("#nomBodegaPago").html(json.nomBodega);
            if(json.idTipoPago==0){
                $("#nomTipoPagoPago").html("Sin Pago");
            }else{
                $("#nomTipoPagoPago").html(json.nomTipoPago);
            }           
            $("#observacionPago").html(json.observacion);
            
            $("#popPago").dialog({
                bgiframe: true,
                resizable: false,
                autoOpen: false,
                modal: true,
                width: 550,
                heigth: 300,
                title: "Ingreso Pago",
                overlay: {
                    backgroundColor: '#000',
                    opacity: 0.5
                },
                buttons : {
                    'Cancelar': function() {
                        $(this).dialog('close');
                    },
                    'Ingresar Pago': function() {
                        ingPagoBD(idRecepcion);
                    }
                },
                close   : function() {
                    document.location.href = document.location.href;
                }
            });
            
            $("#popPago").dialog("open");          

        },
        error: function() {
            alert("Error desconocido 1");
        }
    });

}

function ingPagoBD(idRecepcion) {
    $.ajax({
        data: {
            idRecepcion : idRecepcion,
            idTipoPago : $("#cmbTipoPago option:selected").val(),
            observacion : $("#observacionPago").val()

        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/listRecepcionProductos/ingPago.php",
        success : function(json) {      
                
            $("#popPago").dialog("close"); 
                
        },
        error: function() {
            alert("Error desconocido");
        }
    });
}