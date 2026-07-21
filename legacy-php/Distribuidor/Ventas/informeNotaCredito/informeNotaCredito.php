<?php
include_once("Coneccion/coneccion.php");
include_once("Clases/Lista.php");

    $lista = new Lista();
    $listaVendedores = $lista->getListaVendedores("");
    $numVendedores = $lista->getTotalRegistros();
    
    $listaTipoPago = $lista->getListaTipoPago("");
    $numTiposPago = $lista->getTotalRegistros();
?>

<div id="infVentas">
    <form action="javascript:genInformeNotaCredito()" method="POST">
        <h1>
            <table width="100%">
                <tr>
                    <td>
                        Seleccione Fecha Inicio
                        <input type="text" id="fechaIni" name="fechaIni" value="" readonly />
                    </td>
                    <td class="linkElim" align="left" style="vertical-align: top; width: 40%">
                        <a href="javascript:vaciarFechaIni()" class="linkElim" title="Vaciar"></a>
                    </td>
                </tr>
                <tr>
                    <td>
                        Seleccione Fecha Fin
                        <input type="text" id="fechaFin" name="fechaFin" value="" readonly />
                    </td>
                    <td class="linkElim" align="left" style="vertical-align: top">
                        <a href="javascript:vaciarFechaFin()" class="linkElim" title="Vaciar"></a>
                    </td>
                    <td align="right">
                        <button id="genInforme">Generar Informe</button>
                    </td>
                </tr>
            </table>
        </h1>
    </form>
    <br />

    <div id="detalleVenta">
        
    </div>
</div>

<?php include("popUps/popUpError.php"); ?>