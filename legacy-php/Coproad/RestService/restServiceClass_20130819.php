<?php
include_once ("../Coneccion/coneccion.php");
include_once ("../Clases/Usuario.php");
include_once("../Clases/Lista.php");
include_once("../Clases/ObjExtractor.php");
include_once("../Clases/PrecioProducto.php");
include_once("../Clases/LocalCliente.php");
require_once __DIR__.'/../Globales/funciones.php';
//include_once("../Clases/Cliente.php");


/*
 * Created on 10-04-2012
*
* To change the template for this generated file go to
* Window - Preferences - PHPeclipse - PHP - Code Templates
*/

class restServiceClass {

	public $url;
	public $verb;
	public $requestBody;
	public $requestLength;
	public $acceptType;
	public $responseBody;
	public $responseInfo;

	public function __construct($url, $verb, $requestBody) {
		$this->url = $url;
		$this->verb = $verb;
		$this->requestBody = $requestBody;
		$this->requestLength = 0;
		$this->username = null;
		$this->password = null;
		$this->acceptType = 'application/json';
		$this->responseBody = null;
		$this->responseInfo = null;
		/*
		 if ($this->requestBody !== null) {
		$this->buildPostBody();
		}
		*/
	}

	public function flush() {
		$this->requestBody = null;
		$this->requestLength = 0;
		$this->verb = 'GET';
		$this->responseBody = null;
		$this->responseInfo = null;
	}

	public function execute() {
		try {
			switch (strtoupper($this->verb)) {
				case 'GET' :
					$this->executeGet($this->requestBody);
					break;
				case 'POST' :
					$this->executePost($this->requestBody);
					break;
				case 'PUT' :
					$this->executePut($this->requestBody);
					break;
				case 'DELETE' :
					$this->executeDelete($this->requestBody);
					break;
				default :
					throw new InvalidArgumentException('Current verb (' . $this->verb . ') is an invalid REST verb.');
			}
		} catch (InvalidArgumentException $e) {
			throw $e;
		} catch (Exception $e) {
			throw $e;
		}
	}

	private function executeGet($requestBody) {
			
		if(strcmp($this->url,"login") == 0 ){
			$this->login($requestBody);
		}elseif(strcmp($this->url,"getListadoRutas") == 0){
			$this->getListadoRutas($requestBody);
		}elseif(strcmp($this->url,"getProducto") == 0) {
			$this->getProducto($requestBody);
		}elseif(strcmp($this->url,"getLocales") == 0){
			$this->getLocales($requestBody);
		}elseif(strcmp($this->url,"getClientes") == 0){
			$this->getClientes($requestBody);
		}elseif(strcmp($this->url,"getPedidos") == 0){
			$this->getPedidos($requestBody);
		}elseif(strcmp($this->url,"getProductosPedido") == 0){
			$this->getProductosPedido($requestBody);
                } elseif(strcmp($this->url, "getProductosActualizarBD") == 0) {
                    $this->getProductosActualizarBD($requestBody);
		} else{
			$obj = new stdClass();
			$obj->mensaje = "ERROR ENCONTRANDO FUNCION GET";
			$this->responseBody = json_encode($obj);
		}
			
			
	}

	private function executePost($requestBody) {

		if(strcmp($this->url,"ingresaPedido") == 0){
			$this->ingresaPedido($requestBody);
		}elseif (strcmp($this->url,"ingresaLocalCliente") == 0){
			$this->ingresaLocalCliente($requestBody);	
		}elseif(strcmp($this->url,"ingresaCliente") == 0   ){
			$this->ingresaCliente($requestBody);
		}			
		else{
			$obj = new stdClass();
			$obj->mensaje = "ERROR ENCONTRANDO FUNCION POST";
			$this->responseBody = json_encode($obj);
		}

	}

	private function executePut($requestBody) {
		if(strcmp($this->url,"editLocalCliente") == 0){
			$this->editLocalCliente($requestBody);
		}else if(strcmp($this->url,"actualizaPedido") == 0){
			$this->actualizaPedido($requestBody);
		}
		else{
			$obj = new stdClass();
			$obj->mensaje = "ERROR ENCONTRANDO FUNCION PUT";
			$this->responseBody = json_encode($obj);
		}
	}

	private function executeDelete($requestBody) {
		if(strcmp($this->url,"removeLocalCliente") == 0){
			$this->removeLocalCliente($requestBody);
		}
		else{
			$obj = new stdClass();
			$obj->mensaje = "ERROR ENCONTRANDO FUNCION DELETE";
			$this->responseBody = json_encode($obj);
		}
	}

	private function getStatusCodeMessage($status)
	{
		//Analizar de que otra forma realizar este proceso
		$codes = Array(
				100 => 'Continue',
				101 => 'Switching Protocols',
				200 => 'OK',
				201 => 'Created',
				202 => 'Accepted',
				203 => 'Non-Authoritative Information',
				204 => 'No Content',
				205 => 'Reset Content',
				206 => 'Partial Content',
				300 => 'Multiple Choices',
				301 => 'Moved Permanently',
				302 => 'Found',
				303 => 'See Other',
				304 => 'Not Modified',
				305 => 'Use Proxy',
				306 => '(Unused)',
				307 => 'Temporary Redirect',
				400 => 'Bad Request',
				401 => 'Unauthorized',
				402 => 'Payment Required',
				403 => 'Forbidden',
				404 => 'Not Found',
				405 => 'Method Not Allowed',
				406 => 'Not Acceptable',
				407 => 'Proxy Authentication Required',
				408 => 'Request Timeout',
				409 => 'Conflict',
				410 => 'Gone',
				411 => 'Length Required',
				412 => 'Precondition Failed',
				413 => 'Request Entity Too Large',
				414 => 'Request-URI Too Long',
				415 => 'Unsupported Media Type',
				416 => 'Requested Range Not Satisfiable',
				417 => 'Expectation Failed',
				500 => 'Internal Server Error',
				501 => 'Not Implemented',
				502 => 'Bad Gateway',
				503 => 'Service Unavailable',
				504 => 'Gateway Timeout',
				505 => 'HTTP Version Not Supported'
		);

		return (isset($codes[$status])) ? $codes[$status] : '';
	}

	private function login($requestBody){

		header("Content-Type: application/json");
		//$this->requestBody : Objecto Json
		$obj = new stdClass();
		if(json_decode($requestBody) == null){
			$obj->mensaje = "ERROR JSON PARAMETROS";
		}else{
			$parametros = json_decode($requestBody);
			$rut = $parametros->rut;
			$pass = $parametros->pass;
			$usuario = new Usuario($rut, $pass);

			if ($usuario->getEstado() == 1) {
				//$obj->mensaje = "LOGIN SUCCESFULL";
				$obj = object_extractor::get_vars($usuario);				
				$this->responseBody = json_encode($obj);
					
			}else{
				$obj->mensaje = "LOGIN FAIL";
				$this->responseBody = json_encode($obj);
			}
		}
	}

	private function getPedidos($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj->mensaje = "ERROR JSON PARAMETROS";
		}else{
			$parametros = json_decode($requestBody);
			$idUsuario = $parametros->idUsu;

			$query = "SELECT p.id_pedido,p.fecha_pedido,
					 p.id_local_cliente,p.precio_total,
					 lc.nom_local_cliente
				  FROM 30_m_pedido p, 10_m_local_cliente lc 
                                  WHERE DATE(p.fecha_pedido) = CURDATE() 
                                      AND p.id_usuario = ".$idUsuario." 
                                      AND p.id_local_cliente = lc.id_local_cliente
                                      AND p.id_estado = 1
				  ORDER BY p.fecha_pedido ";
			$db = conectarse();				
			$resDB = mysql_query($query, $db) or die(mysql_error());
			$totRes = mysql_num_rows($resDB);

			$i = 0;
			$listaPedidos = Array();

			if($totRes > 0) {
				while ($filaDB = mysql_fetch_assoc($resDB)) {
					$pedido = new stdClass();
					$pedido->id_pedido = $filaDB["id_pedido"];
					$pedido->fecha_pedido = $filaDB["fecha_pedido"];
					$pedido->id_local_cliente = $filaDB["id_local_cliente"];
					$pedido->precio_total = $filaDB["precio_total"];
					$pedido->nom_local_cliente = $filaDB["nom_local_cliente"];					
					$listaPedidos[$i] = $pedido;
					$i++;
				}
				$objArray = array();
				$k = 0;
				foreach ($listaPedidos as $i=>$e){
					$jsonObject = object_extractor::get_vars ($e);
					$objArray[$k] = $jsonObject;
					//$objArray[$k][$k] = $jsonObject;
					$k++;
				}
				$this->responseBody = json_encode($objArray);
			}else{
				$obj = "[{\"ERROR\":\"NO se encontraron locales\"}]";
				$this->responseBody = $obj;				
			}			
		}
		
	}
	
	private function getListadoRutas($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"NO se encontraron rutas para este dia\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$numDia = $parametros->numDia;
			$idUsu = $parametros->idUsu;
			$lista = new Lista();
			$listaRutas = $lista->getListaRutas("../", $numDia, $idUsu, true);
			if($listaRutas != null){
				$objArray = array();
				$k = 0;
				foreach ($listaRutas as $i=>$e){
					$jsonObject = object_extractor::get_vars ($e);
					$objArray[$k] = $jsonObject;
					//$objArray[$k][$k] = $jsonObject;
					$k++;
				}
				$this->responseBody = json_encode(utf8ize($objArray));
			}else{
				$obj = "[{\"ERROR\":\"NO se encontraron rutas para este dia\"}]";
				$this->responseBody = $obj;
			}
		}
	}
	
	
	
	private function getProductosPedido($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"No Existe Producto\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$idPedido = $parametros->idPedido;
			$db = conectarse();
					
			$i = 0;
			$listaProducto = Array();
                        
                        include_once("../Clases/Venta.php");
                        $venta = new Venta();
			
                        //pp.precio / (1 + (pp.porcen_desc / 100)) AS precio_venta,
                        $query = 
                            "SELECT p.id_producto,
                                    p.cod_serfel,
                                    p.nom_producto,
                                    p.id_tipo_producto,
                                    p.impuesto,
                                    p.costo_prom,
                                    p.ult_fecha_compra,
                                    m.nom_marca,
                                    um.nom_UM,
                                    pp.precio_neto,
                                    pp.precio,
                                    (SELECT SUM(cantidad)
                                     FROM 50_m_stock s
                                     WHERE s.id_producto = p.id_producto) AS cantidad_stock,
                                    pp.precio AS precio_venta,
                                    pp.porcen_desc,
                                    (SELECT SUM(ppe.cantidad)
                                     FROM 30_m_producto_pedido ppe
                                         INNER JOIN 30_m_pedido pe ON ppe.id_pedido = pe.id_pedido AND pe.id_estado = 1
                                     WHERE ppe.id_producto = p.id_producto) AS cantidad_pedida,
                                    pp.max_porcen_desc,
                                    ppe.cantidad AS cantidad_pedido,
                                    ppe.precio AS precio_pedido,
                                    ppe.porcen_desc AS porcen_desc_pedido,
                                    ppe.precio_neto AS precio_neto_pedido
                             FROM 20_m_producto p
                                 INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                                 INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                                 INNER JOIN 30_m_producto_pedido ppe ON p.id_producto = ppe.id_producto AND ppe.id_pedido = " . $idPedido . " 
                                 LEFT OUTER JOIN 40_m_precio_producto pp ON p.id_producto = pp.id_producto
                                     AND pp.id_lista_precio = 1";
			
			//if($totResProducto > 0) {
			//	while ($filaDBProducto = mysql_fetch_assoc($resDBProducto)) {																									
					//$query2 = $query." WHERE p.id_producto = ".$filaDBProducto["id_producto"];									
					$resDB = mysql_query($query, $db) or die(mysql_error());
					$totRes = mysql_num_rows($resDB);					
					$i = 0;									
					if($totRes > 0) {
						while ($filaDB = mysql_fetch_assoc($resDB)) {
							$precioProducto = new stdClass();
							$precioProducto->id_producto     = $filaDB["id_producto"];
							$precioProducto->cod_serfel      = $filaDB["cod_serfel"];
                                                        $precioProducto->impuesto        = $filaDB["impuesto"];
							$precioProducto->nom_producto    = $filaDB["nom_producto"];
							$precioProducto->nom_marca       = $filaDB["nom_marca"];
							$precioProducto->nom_UM          = $filaDB["nom_UM"];
							$precioProducto->cantidad_stock  = $filaDB["cantidad_stock"];
							$precioProducto->cantidad_pedida = $filaDB["cantidad_pedida"];
                                                        $precioProducto->cantidad        = $filaDB["cantidad_pedido"];
							$precioProducto->precio_base     = $filaDB["precio_pedido"];
							$precioProducto->precio_neto     = $filaDB["precio_neto_pedido"];
                                                        $precioProducto->porcen_desc     = $filaDB["porcen_desc_pedido"];
							$precioProducto->costo_prom       = $filaDB["costo_prom"];
							$precioProducto->ult_fecha_compra = $filaDB["ult_fecha_compra"];
							$precioProducto->max_porcen_desc  = $filaDB["max_porcen_desc"];

                                                        $precioProducto->imp_iaba  = 0;
                                                        $precioProducto->imp_espec = 0;
                                                        $precioProducto->iva         = $precioProducto->precio_neto * $venta->getIva() / 100;
                                                        $precioProducto->precio_base = $precioProducto->precio_neto + $precioProducto->iva;

                                                        if($precioProducto->impuesto == 1) {
                                                            $precioProducto->imp_iaba  = $precioProducto->precio_neto * $venta->getIaba() / 100;
                                                            $precioProducto->precio_base = $precioProducto->precio_neto + $precioProducto->iva + $precioProducto->imp_iaba;
                                                            //$this->iva      -= $this->imp_iaba;
                                                        } else if($precioProducto->impuesto == 2) {
                                                            $precioProducto->imp_espec = $precioProducto->precio_neto * $venta->getImpEspec() / 100;
                                                            $precioProducto->precio_base = $precioProducto->precio_neto + $precioProducto->iva + $precioProducto->imp_espec;
                                                            //$this->iva      -= $this->imp_espec;
                                                        }
                                                        $precioProducto->precio_venta = $precioProducto->precio_base - $precioProducto->precio_base * $precioProducto->porcen_desc / 100;
                                                        
                                                        if($precioProducto->cantidad_stock == "") $precioProducto->cantidad_stock = 0;
                                                        if($precioProducto->precio_base == "") $precioProducto->precio_base = 0;
                                                        if($precioProducto->precio_venta == "") $precioProducto->precio_venta = 0;
                                                        if($precioProducto->porcen_desc == "") $precioProducto->porcen_desc = 0;
                                                        if($precioProducto->cantidad_pedida == "") $precioProducto->cantidad_pedida = 0;

                                                        $precioProducto->cantidad_disponible = $precioProducto->cantidad_stock - $precioProducto->cantidad_pedida;
                                                        
							$listaProducto[$i] = $precioProducto;
							$i++;
						}																						
					}																				
			//	}		
			//}			
			$objArray = array();
			$k = 0;
			foreach ($listaProducto as $i=>$e){
				$jsonObject = object_extractor::get_vars ($e);
				$objArray[$k] = $jsonObject;
				//$objArray[$k][$k] = $jsonObject;
				$k++;
			}
			$this->responseBody = json_encode($objArray);
		}
	}

	private function getProducto($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"No Existe Producto\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
                        $searcValue = $parametros->searchValue;
			$searchBy = $parametros->searchBy;
                        
                        if(strcmp($searchBy,"id") == 0) {
                            $searcBy = "codSerfel";
                            
                            $precioProducto = new PrecioProducto("../", "1", $searcValue, $searcBy);
                        
                            $obj = object_extractor::get_vars($precioProducto);
                            $objArray = array();
                            $objArray[0] = $obj;
                        } else {
                            $searcBy = "idProducto";
                            
                            $db = conectarse();
                            $query = "SELECT id_producto
                                      FROM 20_m_producto
                                      WHERE nom_producto LIKE '%" . $searcValue . "%'";
                            
                            $resDB = mysql_query($query, $db) or die(mysql_error());
                            $i = 0;
                            $objArray = array();
                            while (($filaDB = mysql_fetch_assoc($resDB)) && $i <= 14) {
                                $precioProducto = new PrecioProducto("../", "1", $filaDB["id_producto"], $searcBy);
                        
                                $obj = object_extractor::get_vars($precioProducto);
                                $objArray[$i] = $obj;
                                $i++;
                            }
                            mysql_close($db);
                        }
                        
                        

			$this->responseBody = json_encode($objArray);
		}
	}//FIN GETPRODUCTO
        
        private function getProductosActualizarBD($requestBody){
            header("Content-Type: application/json");
            
            $searcBy = "idProducto";
                            
            $db = conectarse();
            $query = "SELECT id_producto
                      FROM 20_m_producto
                      WHERE id_estado = 1";
                            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $i = 0;
            $objArray = array();
            while (($filaDB = mysql_fetch_assoc($resDB))) {
                $precioProducto = new PrecioProducto("../", "1", $filaDB["id_producto"], $searcBy);
                        
                $obj = object_extractor::get_vars($precioProducto);
                $objArray[$i] = $obj;
                $i++;
            }
            
            $parametros = json_decode($requestBody);
            $idUsuario = $parametros->idUsuario;
            
            $query = "UPDATE 10_m_usuario
                        SET fecha_act_productos = NOW()
                      WHERE id_usuario = " . $idUsuario;
                            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            mysql_close($db);
                
            $this->responseBody = json_encode($objArray);
	}

	private function getLocales($requestBody){
		
		//include("../Clases/LocalCliente.php");
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"NO se encontraron Locales\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$searchBy = $parametros->searchBy;
			$searchValue = $parametros->searchValue;
			
			$db = conectarse();
			$query = "SELECT lc.id_local_cliente,
			lc.nom_local_cliente,
			lc.direccion_local_cliente,
			lc.telefono_local_cliente,
			lc.nom_contacto,
			lc.apell_pat_contacto,
			lc.apell_mat_contacto,
			lc.telefono_contacto,
			c.razon_social
			FROM 10_m_local_cliente lc
				INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
			WHERE lc.id_estado = 1 AND ";

			$addtoquery = "";
			
			if(strcmp($searchBy,"nombreLocal") == 0){
				$addtoquery = " lc.nom_local_cliente Like '%".$searchValue."%'";				 
			}elseif (strcmp($searchBy,"nombreContacto") == 0){
				$addtoquery = " lc.nom_contacto Like '%".$searchValue."%'";
			}elseif(strcmp($searchBy,"rutCliente") == 0){
				$addtoquery = " lc.rut_cliente = ".$searchValue;
			}
			$query = $query.$addtoquery;
			
			$resDB = mysql_query($query, $db) or die(mysql_error());
			$i = 0;
			$listaRutas = Array();
			while (($filaDB = mysql_fetch_assoc($resDB)) && $i <= 14) {
				$listaRutas[$i] = new LocalCliente($filaDB["id_local_cliente"], $filaDB["nom_local_cliente"],
						$filaDB["direccion_local_cliente"], $filaDB["telefono_local_cliente"],
						$filaDB["nom_contacto"], $filaDB["apell_pat_contacto"],
						$filaDB["apell_mat_contacto"], $filaDB["telefono_contacto"], $filaDB["razon_social"]);
				$i++;
			}
			mysql_close($db);
			if($listaRutas != null){
				$objArray = array();
				$k = 0;
				foreach ($listaRutas as $i=>$e){
					$jsonObject = object_extractor::get_vars ($e);
					$objArray[$k] = $jsonObject;
					//$objArray[$k][$k] = $jsonObject;
					$k++;
				}
				$this->responseBody = json_encode(utf8ize($objArray));
			}else{
				$obj = "[{\"ERROR\":\"NO se encontraron locales\"}]";
				$this->responseBody = $obj;
			}
		}
		
	}

	private function getClientes($requestBody){		
		header("Content-Type: application/json");

		$lista = new Lista();
		$listaClientes = $lista->getListaClientes("../");
		if($listaClientes != null){
			$objArray = array();
			$k = 0;
			foreach ($listaClientes as $i=>$e){
				$jsonObject = object_extractor::get_vars ($e);
				$objArray[$k] = $jsonObject;
				$k++;
			}
			$this->responseBody = json_encode(utf8ize($objArray));
		}else{
			$obj = "[{\"ERROR\":\"NO se encontraron Clientes\"}]";
			$this->responseBody = $obj;
		}				
	}
		
	private function ingresaPedido($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"No Existe Producto\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$pedido = $parametros->pedido;//JSON {}
			$listadoProductos = $parametros->listadoProductos;//[{},{},...]
			
                        $i = 0;
                        $j = 0;
                        $listaInsert = Array();
                        $list = json_decode($listadoProductos,true);
                        foreach ($list as $i=>$v) {
                            if($j == 23) {
                                $idPedido = $this->addPedido(json_decode($pedido));
                                $b = $this->addProductos($listaInsert, $idPedido);
                                $listaInsert = Array();
                                $j = 0;
                            }
                            $listaInsert[$j] = $list[$i];
                            
                            $j++;
                        }
                        
			$idPedido = $this->addPedido(json_decode($pedido));
			$b = $this->addProductos($listaInsert,$idPedido);
				
			$this->responseBody = json_encode($b);
		}

	}

	private function actualizaPedido($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"No Existe Producto\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$pedidoJSON = $parametros->pedido;//JSON {}
			$pedido = json_decode($pedidoJSON);
			$listadoProductos = $parametros->listadoProductos;//[{},{},...]
			$db = conectarse();	
			$date = date("Y-m-d H:i:s");
			$query = "UPDATE 30_m_pedido SET precio_total = ".$pedido->precio_total." WHERE id_pedido = ".$pedido->id_pedido;
			$resDB = mysql_query($query, $db) or die(mysql_error());
			$query = "DELETE FROM 30_m_producto_pedido WHERE id_pedido = ".$pedido->id_pedido;
			$resDB = mysql_query($query, $db) or die(mysql_error());
                        
                        $i = 0;
                        $j = 0;
                        $listaInsert = Array();
                        $list = json_decode($listadoProductos,true);
                        foreach ($list as $i=>$v) {
                            if($j == 23) {
                                $idPedido = $this->addPedido(json_decode($pedido));
                                $b = $this->addProductos($listaInsert, $idPedido);
                                $listaInsert = Array();
                                $j = 0;
                            }
                            $listaInsert[$j] = $list[$i];
                            
                            $j++;
                        }
                        
			$b = $this->addProductos($listaInsert, $pedido->id_pedido);			
			$this->responseBody = json_encode($b);			
		}	
	}
		
	private function addPedido($pedido){
		$db = conectarse();
		$query = "SELECT (MAX(id_pedido) + 1) as id_pedido
		FROM 30_m_pedido";
		$resDB = mysql_query($query, $db) or die(mysql_error());
		while ($filaDB = mysql_fetch_assoc($resDB)) $idPedido = $filaDB["id_pedido"];
		if($idPedido == "") $idPedido = 1;
		$date = date("Y-m-d H:i:s");
		//AUX
		$pedido->id_lista_precio = 1;
		$query = "INSERT INTO 30_m_pedido (id_pedido,fecha_pedido,id_local_cliente,dia_ruta,id_forma_pago,tiempo,precio_total,id_usuario,id_lista_precio,id_estado) VALUES ".
				"(".$idPedido.",'".$date."',".$pedido->id_local_cliente.",".$pedido->dia_ruta.",".$pedido->id_forma_pago.",0,".$pedido->precio_total.",".$pedido->id_usuario.",".$pedido->id_lista_precio.",1)";

		$r = mysql_query($query,$db);
		mysql_close($db);
		return $idPedido;
	}

	private function addProductos($list,$idPedido){
		$db = conectarse();
		$i = 0;
		foreach ($list as $i=>$v){
			$idProducto = $list[$i]["id_producto"];
			$cantidad = $list[$i]["cantidad"];
			$precio = $list[$i]["precio"];
			$porcen_desc = $list[$i]["porcen_desc"];
			$precio_neto = $list[$i]["precio_neto"];
			$query = "INSERT INTO 30_m_producto_pedido (id_pedido,id_producto,cantidad,precio,porcen_desc,precio_neto) VALUES".
					"(".$idPedido.",".$idProducto.",".$cantidad.",".$precio.",".$porcen_desc.",".$precio_neto.")";
			$r = mysql_query($query,$db);
			$i++;
		}
		mysql_close($db);
		return $i;
	}
	
	private function ingresaLocalCliente($requestBody){
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"Error Ingreso Local Cliente\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$strLocalCliente = $parametros->addLocalCliente;
			$lc = json_decode($strLocalCliente);
			$idVendedor = 1;
			$idFormaPago = 1;
			$idUsuIng = 1;
			$newLocalCliente = new LocalCliente();			
			$resultado = $newLocalCliente->ingLocalCliente($lc->rutCliente , $lc->localCliente, $lc->direccionLocalCliente, $lc->fonoLocalCliente,			
					$lc->emailLocalCliente, $lc->nomContacto, $lc->apPaterno, $lc->apMaterno, $lc->fonoContacto, 
					$lc->emailContacto, $lc->topeVenta, $lc->topeCredito, $idVendedor, $idFormaPago, $lc->observaciones, $lc->idUsuIng);						
			$this->responseBody = $resultado;
		}
		
	}
	
	private function removeLocalCliente($requestBody){
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"Error Remove Local Cliente\"}]";
			$this->responseBody = $obj;
		}else{
			$parametros = json_decode($requestBody);
			$idLocalCliente = $parametros->idLocalCliente;
			$idUsuElim = $parametros->idUsuElim;
			$rmLocalCliente = new LocalCliente();			
			$resultado = $rmLocalCliente->elimLocalCliente($idLocalCliente, $idUsuElim);
			$this->responseBody = $resultado;
		}	
	}
	
	private function editLocalCliente($requestBody){
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"Error Update Local Cliente\"}]";
			$this->responseBody = $obj;
		}else{
			
			$parametros = json_decode($requestBody);
			$strLocalCliente = $parametros->editLocalCliente;
			$lc = json_decode($strLocalCliente);
			$idUsuMod = 1;			
			$updLocalCliente = new LocalCliente();
			$resultado = $updLocalCliente->modLocalCliente($lc->idLocalCliente, $lc->localCliente, $lc->direccionLocalCliente, $lc->fonoLocalCliente, $lc->emailLocalCliente, $lc->nomContacto, $lc->apPaterno, 
			$lc->apMaterno, $lc->fonoContacto, $lc->emailContacto, $lc->idUsuMod);
			$this->responseBody = $resultado;
			
			
		}
		
	}
	
	private function ingresaCliente($requestBody){
		
		header("Content-Type: application/json");
		if(json_decode($requestBody) == null){
			$obj = "[{\"ERROR\":\"Error Ingreso Local Cliente\"}]";
			$this->responseBody = $obj;
		}else{
			include("../Clases/Cliente.php");
			$parametros = json_decode($requestBody);
			$strCliente = $parametros->addCliente;
			$c = json_decode($strCliente);
			$cliente = new Cliente();
			$idListaPrecio = 1;			
			$resultado = $cliente->ingCliente($c->rutCliente, $c->razonSocial, $c->nomFantasia, $idListaPrecio, 
					$c->fonoClie, $c->direClie, $c->comuna, $c->emailClie, $c->idUsuIng);
			$this->responseBody = $resultado;
		}		
	}
	
	
	


}

?>
