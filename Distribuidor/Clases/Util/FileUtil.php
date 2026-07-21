<?php

/**
 * Description of FileUtil
 *
 * @author ccastro
 */
class FileUtil {
    
    public static function copiarArchivoDesdeURL($cFuente, $cDestino) {
        //$path = realpath($cDestino);
        unlink($cDestino);
        /*
        if ( is_writable($path) ) {
            echo 'borrar ' . $path;
            echo '<br>';
            unlink($path);
            if ( file_exists($path) ) {
                echo 'Se borro';
                echo '<br>';
            }
        }
        */

        $iIntentos = 0;
        //while (!file_exists($cDestino) && $iIntentos < 4) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $cFuente);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            $data = curl_exec ($ch);
            curl_close ($ch);

            $file = fopen($cDestino, "w+");
            fputs($file, $data);
            fclose($file);
            sleep(1);
            /*if ( filesize($path) == 0 ) {
                unlink($path);
            }*/

            $iIntentos++;
        //}
        
        return file_exists($cDestino);
    }
    
}