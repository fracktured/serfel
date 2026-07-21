                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

/**
 * Description of RutaREST
 *
 * @author ccastro
 */
class RutaREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once APPPATH.'libraries/BasicAuth.php';
        require_once SERFELCLASSPATH.'Constantes/UsuarioCONST.php';
        require_once SERFELCLASSPATH.'Constantes/MensajesCONST.php';
        require_once SERFELCLASSPATH.'Negocio/RutaNEG.php';
        require_once SERFELCLASSPATH.'POJO/Usuario.php';
        require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
        require_once SERFELCLASSPATH.'Mapper/RutaMapper.php';
        require_once SERFELCLASSPATH.'Mapper/LocalClienteMapper.php';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }
    
    public function listRuta_get() {
        $aData["bExito"] = FALSE;
        $iDiaDeLaSemana = $this->get("iDiaDeLaSemana");
        
        session_start();
        if ( !isset($_SESSION["oUsuarioSession"])
                || ($_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR) ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else if ( !isset($iDiaDeLaSemana) ) {
            $aData["cMensaje"] = "Debe declarar parámetros de búsqueda";
        } else {
            
            $oUsuario = $_SESSION["oUsuarioSession"]->oUsuario;
            $idUsuario = $oUsuario->id_usuario;

            try {
                $oRutaNDTO = RutaNEG::obtRutaDia($idUsuario, $iDiaDeLaSemana);

                $aData["idUsuario"] = $idUsuario;
                $aData["iDiaDeLaSemana"] = $iDiaDeLaSemana;
                $aData["oRuta"] = $oRutaNDTO->oRuta;
                $aData["listLocalesRuta"] = $oRutaNDTO->listLocalesRuta;
                $aData["cMensaje"] = "";
                $aData["bExito"] = TRUE;
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
            
        }

        $this->response($aData);
    }

    public function routeByDay_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
        
        $iDiaDeLaSemana = $this->get("iDiaDeLaSemana");
        if ( !isset($iDiaDeLaSemana) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        $idUsuario = $oUsuario->id_usuario;
        try {
            $oRutaNDTO = RutaNEG::obtRutaDia($idUsuario, $iDiaDeLaSemana);
            if ( $oRutaNDTO->bExito ) {
                $aData["idUsuario"] = $idUsuario;
                $aData["iDiaDeLaSemana"] = $iDiaDeLaSemana;
                $aData["ruta"] = RutaMapper::fromEntityToDTO( $oRutaNDTO->oRuta );
                $aData["locales"] = LocalClienteMapper::fromEntitysToDTOs( $oRutaNDTO->listLocalesRuta );
                $aData["mensaje"] = "";
                $aData["exito"] = TRUE;
            } else {
                $aData["mensaje"] = $oRutaNDTO->cMensaje;
            }
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function routeByDay_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }
    
}
