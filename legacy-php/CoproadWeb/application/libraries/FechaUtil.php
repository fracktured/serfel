<?php

/**
 * Description of FechaUtil
 *
 * @author ccastro
 */
class FechaUtil {
    
    /**
     * Retorna edad en años usando fecha en siguiente formato 'Y-m-d'
     * 
     * @param string $fechaNacimiento
     */
    public static function obtEdad($fechaNacimiento) {
        $tz  = new DateTimeZone('Europe/Brussels');
        
        return DateTime::createFromFormat('Y-m-d', $fechaNacimiento, $tz)->diff(new DateTime('now', $tz))->y;
    }
    
}
