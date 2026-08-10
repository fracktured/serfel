/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    
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
});

function consultarCliente() {
    if($("#rutCliente").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Rut de Cliente para continuar.");
        $("#popUpError").dialog("open");
    } else {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Clientes/Globales/obtInfoCliente.php",
            data    : {
                rutCliente: $("#rutCliente").val()
            },
            success: function(json) {
                if(json.rut == "") {
                    $("#popUpErrorMensaje").html("El Rut ingresado no se encuentra en el Sistema.");
                    $("#popUpError").dialog("open");
                } else {
                    $("#datosCliente").find("div").remove();
                    
                    var atencion = "";
                    
                    if(json.lunes > 0)     atencion += "Lunes "
                    if(json.martes > 0)    atencion += "Martes "
                    if(json.miercoles > 0) atencion += "Miercoles "
                    if(json.jueves > 0)    atencion += "Jueves "
                    if(json.viernes > 0)   atencion += "Viernes "
                    
                    var datos = "<div>" +
                                    "<h2><b>" + json.rut_completo + " " + json.razon_social + "</b></h2>" + 
                                    "<br />" +
                                    "Dirección: <b>" + json.direccion + "</b>" + 
                                    "<br />" +
                                    "Comuna: <b>" + json.comuna + "</b>" + 
                                    "<br />" +
                                    "Email: <b>" + json.email + "</b>" + 
                                    "<br />" +
                                    "Telefono: <b>" + json.telefono + "</b>" + 
                                    "<br />" +
                                    "Última Factura: <b>" + json.ult_factura + "</b>" +
                                    "<br />" +
                                    "Última Nota de Crédito: <b>" + json.ult_nota_credito + "</b>" +
                                    "<br />" +
                                    "Atención: <b>" + atencion + "</b>" + 
                                    "<br /><br />" + 
                                    "<table id='tablaLocalClientes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                        "<thead>" +
                                            "<tr>" +
                                                "<th>Nº</th>" +
                                                "<th>Nombre Local</th>" +
                                                "<th>Telefono</th>" +
                                                "<th>Contacto</th>" +
                                                "<th>Fono Contacto</th>" +
                                                "<th>Vendedor</th>" +
                                            "</tr>" +
                                        "</thead>" +
                                        "<tbody>";
                    $.each(json.locales, function() {
                        datos += "<tr>" +
                                    "<td>" + this.id_local + "</td>" +
                                    "<td>" + this.nom_local + "</td>" +
                                    "<td align='center'>" + this.telefono + "</td>" +
                                    "<td>" + this.nom_contacto + "</td>" +
                                    "<td>" + this.fono_contacto        + "</td>" +
                                    "<td>" + this.nom_vendedor + "</td>" +
                                "</tr>";
                    });
                    
                    datos +=        "</tbody>" +
                                "</table>" +
                            "</div>";
                         
                    $("#datosCliente").append(datos);
                    
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
                }
            },
            error: function() {alert("Error desconocido");}
        });
        
    }
}