<?php
//require_once __DIR__ . '/../Constantes/SisDistCONST.php';
require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
require_once __DIR__ . '/../Negocio/RutaNEG.php';
require_once __DIR__ . '/../Negocio/VentaNEG.php';
require_once __DIR__ . '/../Usuario.php';
require_once __DIR__ . '/../Util/FechaUtil.php';
require_once __DIR__ . '/../../TCPDF/tcpdf.php';
require_once __DIR__ . '/../../Globales/funciones.php';
date_default_timezone_set("America/Santiago");


class MYPDF extends TCPDF {

    public $nomRuta = "";

    //Page header
    public function Header() {
        $this->Cell(0, 15, 'INFORME COBRANZAS', 0, false, 'C', 0, '', 0, false, 'M', 'M');
        $this->SetY(13);
        $this->Cell(0, 15, 'Nombre Ruta: '.$this->nomRuta, 0, false, 'C', 0, '', 0, false, 'M', 'M');
        $this->SetY(18);
        $this->Cell(0, 15, 'Fecha Informe: '.date('d-m-Y'), 0, false, 'C', 0, '', 0, false, 'M', 'M');
        $this->SetY(23);
        $this->SetFont(PDF_FONT_NAME_MAIN, '', 9, '', true);
        $this->Cell(0, 15, 'Página '.$this->getAliasNumPage(), 0, false, 'R', 0, '', 0, false, 'M', 'M');
    }

    // Page footer
    public function Footer() {
        //$this->SetFont(PDF_FONT_NAME_MAIN, '', 11, '', true);
        // Position at 15 mm from bottom
        $this->SetY(-35);
        // Page number
        //$this->Cell(0, 10, 'Page '.$this->getAliasNumPage().'/'.$this->getAliasNbPages(), 0, false, 'C', 0, '', 0, false, 'T', 'M');

        $html = 
            '<div align="center">
                <p>
                    Yo ....................................................... rut ..............................<br>
                    con fecha ......................... entrego un monto total de ..............................<br>
                    <br>
                    ..............................<br>
                    Firma
                </p>
            </div>';
        $this->writeHTML($html, true, false, true, false, '');
    }
}

/**
 * Description of InformeCobranzaCTRL
 *
 * @author ccastro
 */
class InformeCobranzaCTRL {

    /**
     * Controlador de Reportes/Cobranzas/informeCobranzas.php
     * 
     * @return PDF
     */
    public static function imprimir() {
        session_start();
        if ( isset($_SESSION["usuario"]) && $_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR ) {
            try {
                $oVentaFB = new VentaFB();
                $oVentaFB->idRuta = filter_input(INPUT_GET, "idRuta");
                $oVentaFB->idEstadoPago = filter_input(INPUT_GET, "idEstadoPago");
                $cRut = filter_input(INPUT_GET, "rutCliente");
                $oVentaFB->cRazonSocialCliente = filter_input(INPUT_GET, "nombre");
                $oVentaFB->cFechaDesde = filter_input(INPUT_GET, "fechaDesde");
                $oVentaFB->cFechaHasta = filter_input(INPUT_GET, "fechaHasta");

                if ($cRut == "") {
                    $oVentaFB->iRutCliente = SisDistCONST::ID_FILTRO_TODOS;
                } else {
                    $oVentaFB->iRutCliente = explode("-", $cRut)[0];
                }
                $oVentaFB->orden = 'c.rut_cliente ASC';

                $oRuta = RutaNEG::obtener($oVentaFB->idRuta);
                $ventas = VentaNEG::listVentasS($oVentaFB);
                $totalesVentas = VentaNEG::totalesVentas($oVentaFB);
                
                // create new PDF document
                $pdf = new MYPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'Letter', true, 'UTF-8', false);

                // set document information
                $pdf->SetCreator(PDF_CREATOR);
                $pdf->SetAuthor('Serfel');
                $pdf->SetTitle('Informe Cobranzas');

                $pdf->nomRuta = $oRuta->nom_ruta;
                
                //$pdf->setPrintHeader(false);
                //$pdf->setPrintFooter(false);
                // set header and footer fonts
                $pdf->setHeaderFont(Array(PDF_FONT_NAME_MAIN, 'B', 13));
                $pdf->setFooterFont(Array(PDF_FONT_NAME_MAIN, '', 11));

                // set default monospaced font
                //$pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);

                // set margins
                $pdf->SetMargins(3, 30, 7);
                $pdf->SetHeaderMargin(PDF_MARGIN_HEADER);
                //$pdf->SetFooterMargin(PDF_MARGIN_FOOTER);

                //$pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
                //$pdf->setFontSubsetting(true);
                $pdf->SetFont(PDF_FONT_NAME_MAIN, '', 10, '', true);
                
                $pdf->SetAutoPageBreak(TRUE, 30);
                // This method has several options, check the source code documentation for more information.
                $pdf->AddPage();

                /* Campos que se encuentran con el minimo posible de ancho
                 * Rut Cliente
                 * Cond. Pago
                 * Fecha F
                 * x Pagar
                 */
                $cabecera = 
                    '<table>
                        <tr class="header">
                            <th width="7%">Folio</th>
                        <th width="36%">Razón Social</th>
                            <th width="10%">Rut Cliente</th>
                            <th width="17%">Cond. Pago</th>
                            <th width="10%">Fecha F</th>
                            <th width="11%">x Pagar</th>
                        <th width="9%">Obs</th>
                        </tr>
                ';

                $html = 
                    '<style>
                        tr {
                            text-align: center;
                        }

                        tr.header th {
                            font-weight: bold;
                            border-bottom: 1pt solid black;
                        }

                        td.observaciones {
                            border-bottom: 1pt solid black;
                        }
                    </style>
                    '.$cabecera;

                //setlocale(LC_MONETARY, 'es_CL.UTF-8');
                //money_format()
                $cantFactVencidas = 0;
                $precioTotalFactVencidas = 0;
                $i = 0;
                foreach($ventas as $venta) {
                    // Si llegamos a siguiente página
                    /*if ( $i == 48 ) {
                        $i = 0;
                        $html .=
                            '</table>
                            '.$cabecera;
                    }*/

                    $porPagar = $venta->precio_total - $venta->iMontoTotalPago - $venta->iMontoTotalNC;
                    if ( $porPagar != 0 ) {
                        $html .=
                            '<tr>
                                <td>'.$venta->num_docto_emitido.'</td>
                                <td align="left" style="white-space: nowrap;">' . substr($venta->razon_social_cliente, 0, 32) . '</td>
                                <td>'.$venta->obtRutCompletoCliente().'</td>
                                <td>'.$venta->nom_forma_pago.'</td>
                                <td>'.FechaUtil::aLocal($venta->fecha_venta, 'd/m/Y').'</td>
                                <td align="right">'.getFormatoDineroEntero( $venta->precio_total - $venta->iMontoTotalPago - $venta->iMontoTotalNC ).'</td>
                                <td class="observaciones"></td>
                            </tr>';
                    }

                    $datediff = time() - strtotime($venta->fecha_venta);
                    $diasDeuda = round($datediff / (60 * 60 * 24));
                    if ( ($venta->nom_forma_pago == "CHEQUE C/E 7D" && $diasDeuda > 7)
                            || ($venta->nom_forma_pago == "CHEQUE C/E 15D" && $diasDeuda > 15)
                            || ($venta->nom_forma_pago == "CHEQUE C/E 30D" && $diasDeuda > 30)
                            || ($venta->nom_forma_pago == "CRED 7D COB VEN" && $diasDeuda > 7) ) {
                        $cantFactVencidas++;
                        $precioTotalFactVencidas += $porPagar;
                    }

                    $i++;
                }
                
                $html .= 
                    '</table>
                    <br />
                    <div align="center" width="100%" style="font-weight: bold; padding-bottom: 0;">
                        Cantidad Facturas: '.$totalesVentas->cuenta_ventas.'
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        Total: '.getFormatoDineroEntero($totalesVentas->sum_precio_total - $totalesVentas->sum_total_NC - $totalesVentas->sum_total_pago).'
                    </div>
                    <div align="center" width="100%" style="font-weight: bold;">
                        Facturas vencidas: ' . $cantFactVencidas .'
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        Total: '.getFormatoDineroEntero( $precioTotalFactVencidas ).'
                    </div>';

                $pdf->writeHTML($html, true, false, true, false, '');

                $pdf->Output('Informe Cobranzas.pdf', 'I');

            } catch (Exception $ex) {
                echo $ex->getMessage();
            }
        }
    }

}