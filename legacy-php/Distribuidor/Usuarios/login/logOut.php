<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-11-2011                                        *
 * Desc : Cierra Sesion de usuarios                         *
 ************************************************************/

    session_start();

    session_destroy();

    header ("Location: ../../index.html");
?>
