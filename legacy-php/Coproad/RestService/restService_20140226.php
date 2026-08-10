<?php
/*
 * Created on 10-04-2012
 *
 * To change the template for this generated file go to
 * Window - Preferences - PHPeclipse - PHP - Code Templates
 */


include ("restServiceClass_20140226.php");
 
/*URL-VERB-PARAM*/
$request = file_get_contents('php://input');
$json = json_decode($request);
$obj = new stdClass(); //dummy php built-in class

if(!empty($json)){	
	$url = $json->url;
	$verb = $json->verb;
	$param = $json->param;//Objecto	
	$array = get_object_vars($param);//Arreglo
	$paramJson = json_encode($array);//Json
	
	$restService = new restServiceClass($url,$verb,$paramJson);		
	
	$restService->execute();
	if($restService->responseBody == null){
		$obj->mensaje = "ERROR EN RESPONSE BODY :";
		$restService->responseBody = json_encode($obj);
	}	
}
else{
	$url = null;
	$verb = null;
	$param = null;
	header("Content-Type: application/json");	
    $obj->mensaje = "ERROR REQUEST";
	$restService = new restServiceClass($url,$verb,$param);			
	$restService->responseBody = json_encode($obj);	
}

 
//Final

echo $restService->responseBody;



?>
