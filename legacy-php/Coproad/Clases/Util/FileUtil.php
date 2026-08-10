<?php

/**
 * Description of FileUtil
 *
 * @author ccastro
 */
class FileUtil {

    public static function copiarArchivoDesdeURL($cFuente, &$cDestino) {
        // Download to the system temp dir (always writable) instead of the
        // caller's path under the app tree: /var/www is root-owned while Apache
        // runs as www-data, so fopen() into the app's PDF/ folder failed and the
        // download reported "Error al descargar PDFs". $cDestino is by-reference
        // so the caller receives the real path to hand to PDFMerger. uniqid()
        // avoids collisions since Serfel and Coproad share one container.
        $cDestino = sys_get_temp_dir() . "/" . uniqid() . "_" . basename($cDestino);

        if (file_exists($cDestino)) {
            unlink($cDestino);
        }

        // facturacion.cl genera el PDF de forma asincrona: el primer intento
        // suele devolver una pagina HTML "Por favor espere mientras se genera el
        // documento" en vez del PDF. Reintentar con espera hasta que el WS
        // entregue el PDF (o agotar los intentos). El presupuesto total encaja
        // dentro del originReadTimeout=30s de CloudFront: 5 intentos x 2s de
        // espera = <=8s de espera por archivo.
        $iMaxIntentos = 5;
        $iEsperaSeg = 2;

        for ($i = 1; $i <= $iMaxIntentos; $i++) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $cFuente);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            // Behave like a real HTTP client: follow the WS redirect to the
            // actual PDF, send a browser UA, and don't fail the (public) PDF
            // download on the container's stale CA bundle.
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (compatible; SerfelRehost/1.0)");
            $data = curl_exec($ch);
            $iHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $cType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            $cErr = curl_error($ch);
            curl_close($ch);

            $iLen = ($data === false) ? 0 : strlen($data);
            $bEsPDF = ($data !== false && strncmp($data, "%PDF", 4) === 0);

            error_log(sprintf(
                "[FileUtil] intento %d/%d src=%s http=%s type=%s bytes=%d esPDF=%s curlErr=%s",
                $i, $iMaxIntentos, $cFuente, $iHttp, $cType, $iLen, $bEsPDF ? "si" : "no", $cErr
            ));

            if ($bEsPDF) {
                $file = fopen($cDestino, "w+");
                fputs($file, $data);
                fclose($file);
                return file_exists($cDestino) && filesize($cDestino) > 0;
            }

            // Aun no esta listo (o error transitorio): esperar y reintentar.
            if ($i < $iMaxIntentos) {
                sleep($iEsperaSeg);
            }
        }

        // Se agotaron los intentos sin obtener un PDF valido.
        error_log("[FileUtil] no se obtuvo PDF tras $iMaxIntentos intentos. Ultimos bytes: " . substr((string)$data, 0, 300));
        return false;
    }

}
