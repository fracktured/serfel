<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 23-09-2011                                        *
 * Desc : Clase que controla todos los pedidos a servidor y *
 *        sus respectivas paginas, estilos y js.            *
 ************************************************************/

class Controlador {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $action   = "";
    private $titulo   = "";
    private $pagina   = "";
    private $estilos  = "";
    private $js       = "";
    private $menuPrin = ""; // Atributo que controla a que opcion (del menu superior) corresponde la pagina
    //</editor-fold>

    function __construct($action) {
        $this->action = $action;

        switch ($action) {
            case "index":
                $this->titulo   = "Sistema de Gestión Distribuidora SERFEL";
                $this->menuPrin = "index";
            break;
        
            //<editor-fold defaultstate="collapsed" desc="USUARIOS">
            case "ingUsuario":
                $this->titulo   = "Crear Usuarios";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/formularioIngreso.css' />";
                $this->js       = "<script type='text/javascript' src='Usuarios/ingUsuario/ingUsuario.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>
                                   <script type='text/javascript' src='js/md5-min.js'></script>";
                $this->pagina   = "Usuarios/ingUsuario/ingUsuario.php";
                $this->menuPrin = "usuarios";
            break;
        
            case "listUsuario":
                $this->titulo   = "Lista de Usuarios";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Usuarios/listUsuario/listUsuario.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>
                                   <script type='text/javascript' src='js/md5-min.js'></script>";
                $this->pagina   = "Usuarios/listUsuario/listUsuario.php";
                $this->menuPrin = "usuarios";
            break;
        
            case "listRutas":
                $this->titulo   = "Lista de Rutas de Vendedores";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Usuarios/listRutas/listRutas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Usuarios/listRutas/listRutas.php";
                $this->menuPrin = "usuarios";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="CLIENTES">
            case "ingCliente":
                $this->titulo   = "Crear Clientes";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/formularioIngreso.css' />";
                $this->js       = "<script type='text/javascript' src='Clientes/ingCliente/ingCliente.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>
                                   <script type='text/javascript' src='js/md5-min.js'></script>";
                $this->pagina   = "Clientes/ingCliente/ingCliente.php";
                $this->menuPrin = "clientes";
            break;
        
            case "listCliente":
                $this->titulo   = "Lista de Clientes";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Clientes/listCliente/listCliente.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Clientes/listCliente/listCliente.php";
                $this->menuPrin = "clientes";
            break;

            case "localesCliente":
                $this->titulo   = "Lista de Locales de Cliente";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Clientes/localesCliente/localesCliente.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Clientes/localesCliente/localesCliente.php";
                $this->menuPrin = "clientes";
            break;
        
            case "consultaClientes":
                $this->titulo   = "Consulta de Cliente";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Clientes/consultaClientes/consultaClientes.css' />";
                $this->js       = "<script type='text/javascript' src='Clientes/consultaClientes/consultaClientes.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Clientes/consultaClientes/consultaClientes.php";
                $this->menuPrin = "clientes";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="EMPRESAS">
            case "listEmpresa":
                $this->titulo   = "Lista de Empresas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Empresas/listEmpresa/listEmpresa.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Empresas/listEmpresa/listEmpresa.php";
                $this->menuPrin = "mantenedores";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="PROVEEDORES">
            case "listProveedor":
                $this->titulo   = "Lista de Proveedores";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Proveedores/listProveedor/listProveedor.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Proveedores/listProveedor/listProveedor.php";
                $this->menuPrin = "mantenedores";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="PRODUCTOS">           
            case "listTipoProducto":
                $this->titulo = "Tipo de Productos";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js = "<script type='text/javascript' src='Productos/tipoProducto/listTipoProducto.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina = "Productos/tipoProducto/listTipoProducto.php"; 
                $this->menuPrin = "productos";
            break;
            
            case "listUnidadMedida":
                $this->titulo = "Unidades de Medida";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js = "<script type='text/javascript' src='Productos/unidadMedida/listUnidadMedida.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina = "Productos/unidadMedida/listUnidadMedida.php";
                $this->menuPrin = "productos";
            break;
            
            case "listMarca":
                $this->titulo = "Marcas";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                 $this->js = "<script type='text/javascript' src='Productos/marca/listMarca.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina = "Productos/marca/listMarca.php";
                $this->menuPrin = "productos";
            break;
        
            case "listProducto":
                $this->titulo  = "Lista de Productos";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                  <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js      = "<script type='text/javascript' src='Productos/listProducto/listProducto.js'></script>
                                  <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                  <script type='text/javascript' src='js/funciones.js'></script>
                                  <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>";
                $this->pagina = "Productos/listProducto/listProducto.php";
                $this->menuPrin = "productos";
            break;
        
            case "consultaProductos":
                $this->titulo   = "Consulta de Productos";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Productos/consultaProductos/consultaProductos.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Productos/consultaProductos/consultaProductos.php";
                $this->menuPrin = "productos";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="COMPRAS">
            case "crearNotaCreditoCompra":
                $this->titulo   = "Crear Nota Credito Compra";
                $this->js       = "<script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>"
                                . "<script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Vista/Recepcion/crearNotaCreditoCompra.php";
                $this->menuPrin = "inventario";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="INVENTARIO">
            case "listBodega":
                $this->titulo   = "Lista de Bodegas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/listBodega/listBodega.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/listBodega/listBodega.php";
                $this->menuPrin = "inventario";
            break;
        
            case "listExistencias":
                $this->titulo   = "Detalle de Existencias";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Stock/listExistencias/listExistencias.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/listExistencias/listExistencias.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/listExistencias/listExistencias.php";
                $this->menuPrin = "inventario";
            break;
        
            case "recepcionProductos":
                $this->titulo   = "Facturas de Compra";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Stock/recepcionProductos/recepcionProductos.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/recepcionProductos/recepcionProductos.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/recepcionProductos/recepcionProductos.php";
                $this->menuPrin = "inventario";
            break;

            case "listRecepcionProductos":
                $this->titulo   = "Lista Recepcion Productos";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/listRecepcionProductos/listRecepcionProductos.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/listRecepcionProductos/listRecepcionProductos.php";
                $this->menuPrin = "inventario";
            break;
        
            case "listNivelStock":
                $this->titulo   = "Lista de Alertas de Stock";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/listNivelStock/listNivelStock.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/listNivelStock/listNivelStock.php";
                $this->menuPrin = "inventario";
            break;
        
            case "listMermas":
                $this->titulo   = "Lista de Mermas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Stock/listMermas/listMermas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Stock/listMermas/listMermas.php";
                $this->menuPrin = "inventario";
            break;
            //</editor-fold>
        
            //<editor-fold defaultstate="collapsed" desc="VENTAS">
            case "listPrecioProducto":
                $this->titulo   = "Lista de Precios de Productos";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/listPrecioProducto/listPrecioProducto.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/listPrecioProducto/listPrecioProducto.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/listPrecioProducto/listPrecioProducto.php";
                $this->menuPrin = "ventas";
            break;
        
            case "terminalVentas":
                $this->titulo   = "Crear Factura";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/terminalVentas/terminalVentas.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/terminalVentas/terminalVentas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/terminalVentas/terminalVentas.php";
                $this->menuPrin = "ventas";
            break;
        
            case "listVentas":
                $this->titulo   = "Lista de Ventas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/listVentas/listVentas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>";
                $this->pagina   = "Ventas/listVentas/listVentas.php";
                $this->menuPrin = "ventas";
            break;
        
            case "listNotaCredito":
                $this->titulo   = "Lista de Notas de Crédito";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/listNotaCredito/listNotaCredito.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/listNotaCredito/listNotaCredito.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>";
                $this->pagina   = "Ventas/listNotaCredito/listNotaCredito.php";
                $this->menuPrin = "ventas";
            break;
        
            case "anularVenta":
                $this->titulo   = "Anular Venta";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='Ventas/terminalNotaCredito/terminalNotaCredito.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/anulacionVenta/anulacionVenta.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/anulacionVenta/anulacionVenta.php";
                $this->menuPrin = "ventas";
            break;
        
            case "terminalVentaPedidos":
                $this->titulo   = "Terminal de Venta de Pedidos";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/terminalVentaPedidos/terminalVentas.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/terminalVentaPedidos/terminalVentas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/terminalVentaPedidos/terminalVentas.php";
                $this->menuPrin = "ventas";
            break;
        
            case "terminalNotaCredito":
                $this->titulo   = "Crear Nota de Crédito";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/terminalNotaCredito/terminalNotaCredito.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/terminalNotaCredito/terminalNotaCredito.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/terminalNotaCredito/terminalNotaCredito.php";
                $this->menuPrin = "ventas";
            break;
        
            case "imprimirNotaCredito":
                $this->titulo   = "Imprimir Nota de Crédito";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/imprimirNotaCredito/imprimirNotaCredito.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/imprimirNotaCredito/imprimirNotaCredito.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/imprimirNotaCredito/imprimirNotaCredito.php";
                $this->menuPrin = "ventas";
            break;
        
            case "informeVentas":
                $this->titulo   = "Informe de Ventas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/informeVentas/informeVentas.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/informeVentas/informeVentas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/informeVentas/informeVentas.php";
                $this->menuPrin = "ventas";
            break;
        
            case "informeNotaCredito":
                $this->titulo   = "Informe de Notas de Crédito";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/informeNotaCredito/informeNotaCredito.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/informeNotaCredito/informeNotaCredito.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/informeNotaCredito/informeNotaCredito.php";
                $this->menuPrin = "ventas";
            break;
        
            case "imprimirRutario":
                $this->titulo   = "Imprimir Rutario";
                $this->estilos  = "";
                $this->js       = "<script type='text/javascript' src='Ventas/imprimirRutario/imprimirRutario.js'></script>";
                $this->pagina   = "Ventas/imprimirRutario/imprimirRutario.php";
                $this->menuPrin = "ventas";
            break;
        
            case "imprimirListadoCarga":
                $this->titulo   = "Imprimir Listado Carga";
                $this->estilos  = "";
                $this->js       = "<script type='text/javascript' src='Ventas/imprimirListadoCarga/imprimirListadoCarga.js'></script>";
                $this->pagina   = "Ventas/imprimirListadoCarga/imprimirListadoCarga.php";
                $this->menuPrin = "ventas";
            break;
        
            case "estadoEntregas":
                $this->titulo   = "Estado de Entregas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/estadoEntregas/estadoEntregas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>";
                $this->pagina   = "Ventas/estadoEntregas/estadoEntregas.php";
                $this->menuPrin = "ventas";
            break;
        
            case "estadoEntregasC":
                $this->titulo   = "Estado de Entregas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='Ventas/estadoEntregasChofer/estadoEntregasChofer.css' />";
                $this->js       = "<script type='text/javascript' src='Ventas/estadoEntregasChofer/estadoEntregasChofer.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                                   <script type='text/javascript' src='js/funciones.js'></script>";
                $this->pagina   = "Ventas/estadoEntregasChofer/estadoEntregasChofer.php";
                $this->menuPrin = "ventas";
            break;
            //</editor-fold>

            case "cobranzas":
                $this->titulo = "Cobranzas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />
                                   <link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Cobranzas/cobranzas/cobranzas.js'></script>
                                   <script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>";
                $this->pagina   = "Cobranzas/cobranzas/cobranzas.php";
                $this->menuPrin = "cobranzas";
            break;
        
            case "informeCobranza":
                $this->titulo   = "Informe Cobranzas";
                $this->estilos  = "<link rel='stylesheet' type='text/css' href='css/formFiltros.css' />";
                $this->js       = "<script type='text/javascript' src='Cobranzas/informeCobranza/informeCobranza.js'></script>";
                $this->pagina   = "Cobranzas/informeCobranza/informeCobranza.php";
                $this->menuPrin = "cobranzas";
            break;
        
            // <editor-fold defaultstate="collapsed" desc="FACTURACIÓN ELECTRÓNICA">
            case "subirLibroCV":
                $this->titulo = "Subir Libro Compra/Venta";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js = "<script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                             <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>
                             <script type='text/javascript' src='FacturacionElectronica/subirLibroCV/subirLibroCV.js'></script>";
                $this->pagina = "Vista/FacturacionElectronica/subirLibroCV/subirLibroCV.php";
                $this->menuPrin = "facElec";
                break;
            
            case "consultarLibroCV":
                $this->titulo = "Consultar Libro Compra/Venta";
                $this->estilos = "<link rel='stylesheet' type='text/css' href='css/dataTable.css' />";
                $this->js = "<script type='text/javascript' src='js/jquery/jquery.dataTables.min.js'></script>
                             <script type='text/javascript' src='js/jquery/jquery.numeric.js'></script>";
                $this->pagina = "Vista/FacturacionElectronica/consultarLibroCV.php";
                $this->menuPrin = "facElec";
                break; 
            // </editor-fold>
        }
    }

    function marcarMenuPrincipal($menu) {
        if($menu == $this->menuPrin) return "current";
        else return "top_link";
    }

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    function getTitulo() {
        return $this->titulo;
    }

    function getPagina() {
        return $this->pagina;
    }

    function getEstilos() {
        return $this->estilos;
    }

    function getJs() {
        return $this->js;
    }

    function getMenuPrin() {
        return $this->menuPrin;
    }
    //</editor-fold>
}
?>
