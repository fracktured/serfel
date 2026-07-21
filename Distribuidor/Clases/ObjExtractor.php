<?php
//Clase Extractora de miembros privados o protegidos de clase en particular
//Retorno : Array()
class object_extractor
{
	public static function get_vars ($o)
	{
		$xary = (array) $o;
		$xarynew = array ();
		foreach ($xary as $k => $v)
		{
			if ($k[0] == "\0")
			{
				// miembros privados/protegidos contienen prefijos delimitadores nulos , deben removerse
				$prefix_length = stripos ($k, "\0", 1) + 1;
				$k = substr ($k, $prefix_length, strlen ($k) - $prefix_length);
			}

			// recursividad a objectos referenciados por argumento de funcion
			if (is_object ($v))
			{
				$v = object_extractor::get_vars ($v);
			}
			$xarynew[$k] = $v;
		}
		return $xarynew;
	}
}







?>