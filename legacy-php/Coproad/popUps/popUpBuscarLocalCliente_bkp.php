<script type="text/javascript">
    function mostrarPopUpBuscarCliente() {
        var tabla = "";
    
        $("#listaLocales").find("div").remove();

        $.ajax({
            async   : false,
            type    : "POST",
            dataType: "json",
            url     : "Clientes/Globales/obtListaClientes.php",
            success: function(json) {
                if(json != "") {
                    tabla = "<table id='tablaClientes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                "<thead>" +
                                    "<tr>" +
                                        "<th>Rut</th>" +
                                        "<th>Razon Social</th>" +
                                        "<th>Nombre Fantasía</th>" +
                                        "<th>Telefono</th>" +
                                        "<th>Email</th>" +
                                        "<th>L</th> " +
                                    "</tr>" +
                                "</thead>" +
                                "<tbody>";

                    $.each(json, function() {
                        tabla += "<tr>" +
                                    "<td>" + this.rut_completo + "</td>" +
                                    "<td>" + this.razon_social + "</td>" +
                                    "<td>" + this.nom_fantasia + "</td>" +
                                    "<td align='center'>" + this.telefono + "</td>" +
                                    "<td>" + this.email        + "</td>" +
                                    "<td class='linkLista'>" +
                                        "<a class='linkLista' href='javascript:cargarListaLocales(" + this.rut_cliente + ")'" + 
                                                            "title='Ver Locales'></a></td>" +
                                "</tr>";
                    });

                    tabla +=     "</tbody>" +
                            "</table>";

                    $("#listaLocales").append(tabla);

                    $("#tablaClientes").dataTable({
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

                    $("#popBuscarLocalCliente").dialog({
                        bgiframe: true,
                        resizable: true,
                        autoOpen: false,
                        modal: true,
                        width: 950,
                        overlay: {
                            backgroundColor: '#000',
                            opacity: 0.5
                        }
                    });

                    $("#popBuscarLocalCliente").dialog("open");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
    
    function cargarListaLocales(rutCliente) {
        var tabla = "";

        $("#listaLocales").find("div").remove();

        $.ajax({
            async   : false,
            type    : "POST",
            dataType: "json",
            url     : "Clientes/Globales/obtInfoCliente.php",
            data    : {
                rutCliente : rutCliente
            },
            success: function(json) {
                tabla = "<table id='tablaLocalesClientes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>Nº</th>" +
                                    "<th>Nombre Local</th>" +
                                    "<th>Telefono</th>" +
                                    "<th>Email</th>" +
                                    "<th>Contacto</th>" +
                                    "<th>Fono Contacto</th> " +
                                    "<th>Email Contacto</th> " +
                                    "<th>S</th> " +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";

                $.each(json.locales, function() {
                    tabla += "<tr>" +
                                "<td>" + this.id_local + "</td>" +
                                "<td>" + this.nom_local + "</td>" +
                                "<td align='center'>" + this.telefono + "</td>" +
                                "<td align='center'>" + this.email + "</td>" +
                                "<td>" + this.nom_contacto + "</td>" +
                                "<td align='center'>" + this.fono_contacto  + "</td>" +
                                "<td align='center'>" + this.email_contacto + "</td>" +
                                "<td class='linkLista'>" +
                                    "<a class='linkLista' href='javascript:seleccionarLocalCliente(" + this.id_local + ")'" + 
                                                        "title='Seleccionar Local'></a></td>" +
                            "</tr>";
                });

                tabla +=     "</tbody>" +
                        "</table>";

                $("#listaLocales").append(tabla);

                $("#tablaLocalesClientes").dataTable({
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
            },
            error: function() {alert("Error desconocido");}
        });
    }
</script>

<div id="popBuscarLocalCliente" title="Buscar Local">
    <div id="listaLocales">
        
    </div>
</div>