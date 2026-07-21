<?php 
require_once 'Clases/Util/FormatoUtil.php';
?>

<script type="text/javascript">
    function iniTablaVentas() {
        var tabla = 
                $("#tablaLibro").dataTable({
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
                    }/*,
                    fnRowCallback: function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                        // Row click
                        $(nRow).on('click', function() {
                          console.log('Row Clicked. Look I have access to all params, thank You closures.', this, aData, iDisplayIndex, iDisplayIndexFull);
                        });

                        // Cell click
                        $('td', nRow).on('click', function() {
                          console.log('Col Clicked.', this, aData, iDisplayIndex, iDisplayIndexFull);
                        });
                    }*/
                });
    }
    
    function confirmEliminarVentaLibro(idVenta, iNumDocto, cNomCliente) {
        $("#popUp").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doEliminarVentaLibroCV(idVenta);
                },
                "Cancelar": function() {
                    $(this).dialog("close")
                }
            }
        });

        $("#popUpMsg").html("¿Esta seguro que desea eliminar del Libro VENTA el documento " + iNumDocto + " del cliente " + cNomCliente + "?")
        $("#popUp").dialog("open");
    }

    function doEliminarVentaLibroCV(idVenta) {
        $("#popUpCargando").dialog("open");

        $.ajax({
            data: {
                idVenta: idVenta
            },
            type    : "POST",
            dataType: "json",
            url     : "Ajax/FacturacionElectronica/ajaxEliminarVentaLibroCV.php",
            success : function(oJson) {
                $("#popUpCargando").dialog("close");

                $("#popUp").dialog({
                    autoOpen: false,
                    modal   : true,
                    buttons : {
                        "Ok": function() {
                            if(oJson.bReload) {
                                location.reload();
                            } else {
                                $(this).dialog("close");
                            }
                        }
                    }
                });

                $("#popUp").dialog({title: "Eliminar Venta Libro Compra"});
                $("#popUpMsg").html(oJson.cMensaje);
                $("#popUp").dialog("open");
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert(document.location.href.match(/[^\/]+$/)[0] + ":doEliminarVentaLibroCV\n" + err.Message);
            }
        });
    }
</script>

<table id='tablaLibro' cellpadding='0' cellspacing='0' border='0' class='display'>
    <thead>
        <tr>
            <th>Tipo Documento</th>
            <th>N° Documento</th>
            <th>Rut Cliente</th>
            <th>Razon Social Cliente</th>
            <th>Total Docto</th>
            <th>E</th>
        </tr>
    </thead>
    <tbody>

        <?php
        foreach ($oModel->listVentaNDTO as $oVentaNDTO) {
            $oVenta = $oVentaNDTO->oVenta;
            $oTipoDocto = $oVentaNDTO->oTipoDocto;
            $oCliente = $oVentaNDTO->oCliente;

            echo "<tr>";
            echo "<td>" . $oTipoDocto->nom_tipo_docto . "</td>";
            echo "<td align='center'>" . $oVenta->num_docto_emitido . "</td>";
            echo "<td align='right'>" . $oCliente->obtRutCompleto() . "</td>";
            echo "<td>" . $oCliente->razon_social . "</td>";
            echo "<td align='right'>" . FormatoUtil::formatoDinero($oVenta->precio_total) . "</td>";
            echo "<td class='linkElim'>";
            
            if($oVenta->periodo_libro != '') {
                echo "<a class='linkElim' href='javascript:confirmEliminarVentaLibro(" . $oVenta->id_venta . ", " 
                                                                                       . $oVenta->num_docto_emitido . ", \"" 
                                                                                       . $oCliente->razon_social . "\");' title='Eliminar'></a>";
            }
            
            echo "</td>";
            echo "</tr>";
        }
        ?>

    </tbody>
</table>