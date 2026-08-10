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

    /**
     * Descarga varios PDFs desde facturacion.cl EN PARALELO (curl_multi).
     *
     * Misma semantica de reintentos que copiarArchivoDesdeURL (facturacion.cl
     * genera el PDF de forma asincrona y devuelve HTML "espere" hasta que esta
     * listo), pero en vez de descargar 200 archivos uno por uno de forma
     * secuencial -- lo que hacia superar el timeout de origen de CloudFront con
     * ~100 ventas seleccionadas -- se descargan hasta $iConcurrencia a la vez.
     * En cada intento se relanza solo lo que aun no devolvio un PDF.
     *
     * @param array $aJobs  Lista de descargas: cada item es
     *                      ['key' => string, 'url' => string, 'destBase' => string].
     * @param int   $iConcurrencia  Descargas simultaneas por lote (10 por defecto).
     * @return array  Mapa key => ruta_del_archivo, solo para las descargas exitosas.
     */
    public static function descargarPDFsEnParalelo(array $aJobs, $iConcurrencia = 10) {
        $iMaxIntentos = 5;
        $iEsperaSeg = 2;

        // Estado de trabajo: cada pendiente conserva su URL y su destino final en
        // el temp dir del sistema (siempre escribible; /var/www es root y Apache
        // corre como www-data). uniqid() evita colisiones entre Serfel y Coproad.
        $aResultados = array();  // key => ruta (solo exitosos)
        $aPendientes = array();  // key => ['url' => ..., 'dest' => ...]
        foreach ($aJobs as $oJob) {
            $cDest = sys_get_temp_dir() . "/" . uniqid() . "_" . basename($oJob['destBase']);
            if (file_exists($cDest)) {
                unlink($cDest);
            }
            $aPendientes[$oJob['key']] = array('url' => $oJob['url'], 'dest' => $cDest);
        }

        for ($iIntento = 1; $iIntento <= $iMaxIntentos && !empty($aPendientes); $iIntento++) {
            // Procesar los pendientes en lotes de $iConcurrencia handles a la vez
            // para no abrir cientos de sockets simultaneos contra facturacion.cl.
            foreach (array_chunk(array_keys($aPendientes), $iConcurrencia, true) as $aKeysLote) {
                $mh = curl_multi_init();
                $aHandles = array();
                foreach ($aKeysLote as $cKey) {
                    $ch = curl_init();
                    // Mismos opts que copiarArchivoDesdeURL: seguir redirecciones
                    // del WS al PDF real, UA de navegador, y no fallar por el CA
                    // bundle vencido del contenedor en una descarga publica.
                    curl_setopt($ch, CURLOPT_URL, $aPendientes[$cKey]['url']);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
                    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (compatible; SerfelRehost/1.0)");
                    curl_multi_add_handle($mh, $ch);
                    $aHandles[$cKey] = $ch;
                }

                // Ejecutar el lote hasta que todas las transferencias terminen.
                $iActivas = null;
                do {
                    $iStatus = curl_multi_exec($mh, $iActivas);
                    if ($iActivas) {
                        curl_multi_select($mh, 1.0);
                    }
                } while ($iActivas > 0 && $iStatus == CURLM_OK);

                // Recolectar respuestas: guardar los que ya son PDF, dejar el
                // resto pendiente para el siguiente intento.
                foreach ($aHandles as $cKey => $ch) {
                    $data = curl_multi_getcontent($ch);
                    $iHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $cType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                    $cErr = curl_error($ch);
                    curl_multi_remove_handle($mh, $ch);
                    curl_close($ch);

                    $iLen = ($data === false || $data === null) ? 0 : strlen($data);
                    $bEsPDF = ($iLen > 0 && strncmp($data, "%PDF", 4) === 0);

                    error_log(sprintf(
                        "[FileUtil] paralelo intento %d/%d key=%s http=%s type=%s bytes=%d esPDF=%s curlErr=%s",
                        $iIntento, $iMaxIntentos, $cKey, $iHttp, $cType, $iLen, $bEsPDF ? "si" : "no", $cErr
                    ));

                    if ($bEsPDF) {
                        $cDest = $aPendientes[$cKey]['dest'];
                        $file = fopen($cDest, "w+");
                        fputs($file, $data);
                        fclose($file);
                        if (file_exists($cDest) && filesize($cDest) > 0) {
                            $aResultados[$cKey] = $cDest;
                            unset($aPendientes[$cKey]);
                        }
                    }
                }
                curl_multi_close($mh);
            }

            // Aun quedan PDFs sin generar: esperar y reintentar solo esos.
            if (!empty($aPendientes) && $iIntento < $iMaxIntentos) {
                sleep($iEsperaSeg);
            }
        }

        if (!empty($aPendientes)) {
            error_log("[FileUtil] paralelo: " . count($aPendientes) . " PDFs no obtenidos tras $iMaxIntentos intentos.");
        }

        return $aResultados;
    }

}
