-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 17-11-2023 a las 22:55:24
-- Versión del servidor: 10.3.39-MariaDB-cll-lve
-- Versión de PHP: 8.1.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `serfelcl_distribuidor`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_m_cliente`
--

CREATE TABLE `10_m_cliente` (
  `rut_cliente` int(10) NOT NULL,
  `dv_cliente` varchar(1) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `razon_social` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `nom_fantasia` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `telefono_cliente` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `direccion_cliente` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `comuna` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `ciudad` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `email_cliente` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `id_lista_precio` int(2) NOT NULL DEFAULT 1,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1,
  `permite_venta_deuda` tinyint(4) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_m_empresa`
--

CREATE TABLE `10_m_empresa` (
  `rut_empresa` int(10) NOT NULL,
  `dv_empresa` varchar(1) NOT NULL,
  `razon_social` varchar(50) NOT NULL,
  `nom_fantasia` varchar(50) NOT NULL,
  `direccion_empresa` varchar(255) NOT NULL,
  `acceso_rapido` int(1) NOT NULL DEFAULT 0,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1,
  `giro` varchar(100) NOT NULL,
  `cod_actividad_economica` int(11) NOT NULL,
  `comuna` varchar(25) NOT NULL,
  `ciudad` varchar(25) NOT NULL,
  `rut_representante_legal` int(10) NOT NULL,
  `dv_representante_legal` varchar(1) NOT NULL,
  `fecha_aprobacion_SII` date NOT NULL,
  `num_aprobacion_SII` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_m_local_cliente`
--

CREATE TABLE `10_m_local_cliente` (
  `id_local_cliente` int(5) NOT NULL,
  `rut_cliente` int(10) NOT NULL,
  `nom_local_cliente` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `telefono_local_cliente` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `direccion_local_cliente` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `comuna_local_cliente` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `email_local_cliente` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `giro` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `nom_contacto` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `apell_pat_contacto` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `apell_mat_contacto` varchar(30) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `telefono_contacto` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `email_contacto` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `tope_venta` int(10) NOT NULL DEFAULT 0,
  `tope_credito` int(10) NOT NULL DEFAULT 0,
  `id_vendedor` int(3) NOT NULL DEFAULT 5,
  `id_forma_pago` int(2) NOT NULL DEFAULT 7,
  `comuna` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `observaciones` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT '',
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1,
  `permite_venta_tope_mensual` tinyint(4) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_m_usuario`
--

CREATE TABLE `10_m_usuario` (
  `id_usuario` int(3) NOT NULL,
  `rut_usuario` int(10) NOT NULL,
  `dv_usuario` varchar(1) NOT NULL,
  `nom_usuario` varchar(50) NOT NULL,
  `apell_pat_usuario` varchar(30) NOT NULL,
  `apell_mat_usuario` varchar(30) NOT NULL,
  `password` varchar(50) NOT NULL,
  `id_tipo_usuario` int(1) NOT NULL,
  `telefono_usuario` varchar(15) DEFAULT NULL,
  `direccion_usuario` varchar(200) NOT NULL,
  `email_usuario` varchar(50) DEFAULT NULL,
  `num_usuario` int(2) NOT NULL DEFAULT 0,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1,
  `fecha_act_productos` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_p_tipo_docto`
--

CREATE TABLE `10_p_tipo_docto` (
  `id_tipo_docto` int(2) NOT NULL,
  `nom_tipo_docto` varchar(35) NOT NULL,
  `desc_tipo_docto` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `10_p_tipo_usuario`
--

CREATE TABLE `10_p_tipo_usuario` (
  `id_tipo_usuario` int(1) NOT NULL,
  `nom_tipo_usuario` varchar(15) NOT NULL,
  `desc_tipo_usuario` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `20_m_porcion`
--

CREATE TABLE `20_m_porcion` (
  `id_porcion` int(10) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `fecha` datetime NOT NULL,
  `grupo` int(6) NOT NULL,
  `numero` int(3) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `id_venta` int(10) DEFAULT NULL,
  `id_usuario` int(2) NOT NULL,
  `id_estado` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `20_m_producto`
--

CREATE TABLE `20_m_producto` (
  `id_producto` int(6) NOT NULL,
  `nom_producto` varchar(200) NOT NULL,
  `desc_producto` varchar(200) NOT NULL,
  `cod_barra_producto` varchar(200) NOT NULL,
  `id_tipo_producto` int(3) NOT NULL,
  `id_marca` int(5) NOT NULL,
  `id_UM` int(3) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1,
  `costo_prom` decimal(18,2) DEFAULT 0.00,
  `ult_fecha_compra` datetime DEFAULT NULL,
  `cod_serfel` int(5) NOT NULL DEFAULT 0,
  `impuesto` int(1) NOT NULL DEFAULT 0,
  `usa_porciones` bit(1) NOT NULL DEFAULT b'0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `20_p_marca`
--

CREATE TABLE `20_p_marca` (
  `id_marca` int(5) NOT NULL,
  `nom_marca` varchar(50) NOT NULL,
  `desc_marca` varchar(200) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `20_p_tipo_producto`
--

CREATE TABLE `20_p_tipo_producto` (
  `id_tipo_producto` int(3) NOT NULL,
  `nom_tipo_producto` varchar(15) NOT NULL,
  `desc_tipo_producto` varchar(200) NOT NULL DEFAULT '',
  `nivel_1` int(3) NOT NULL DEFAULT 0,
  `nivel_2` int(3) NOT NULL DEFAULT 0,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `20_p_unidad_medida`
--

CREATE TABLE `20_p_unidad_medida` (
  `id_UM` int(3) NOT NULL,
  `nom_UM` varchar(15) NOT NULL,
  `desc_UM` varchar(150) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `30_m_pedido`
--

CREATE TABLE `30_m_pedido` (
  `id_pedido` int(10) NOT NULL,
  `fecha_pedido` datetime NOT NULL,
  `id_local_cliente` int(5) NOT NULL,
  `dia_ruta` int(1) NOT NULL DEFAULT 0,
  `id_forma_pago` int(2) NOT NULL DEFAULT 0,
  `tiempo` int(2) NOT NULL DEFAULT 0,
  `precio_total` int(10) NOT NULL,
  `id_usuario` int(3) NOT NULL DEFAULT 5,
  `id_lista_precio` int(2) NOT NULL,
  `id_estado` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `30_m_producto_pedido`
--

CREATE TABLE `30_m_producto_pedido` (
  `id_pedido` int(10) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `precio` int(10) NOT NULL,
  `porcen_desc` int(3) NOT NULL,
  `precio_neto` int(10) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_lista_precio`
--

CREATE TABLE `40_m_lista_precio` (
  `id_lista_precio` int(2) NOT NULL,
  `nom_lista_precio` varchar(15) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_motivo_nota_credito`
--

CREATE TABLE `40_m_motivo_nota_credito` (
  `id_motivo` int(2) NOT NULL,
  `nom_motivo` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_nota_credito`
--

CREATE TABLE `40_m_nota_credito` (
  `id_nota_credito` int(10) NOT NULL,
  `id_venta` int(10) NOT NULL,
  `num_nota_credito` int(10) NOT NULL DEFAULT 0,
  `id_tipo_docto_emitido` int(11) NOT NULL,
  `rut_empresa` int(10) NOT NULL DEFAULT 0,
  `iva` int(10) NOT NULL DEFAULT 0,
  `iaba` int(10) NOT NULL DEFAULT 0,
  `espec` int(10) NOT NULL DEFAULT 0,
  `sub_total` int(10) NOT NULL DEFAULT 0,
  `id_motivo` int(2) NOT NULL DEFAULT 1,
  `id_usuario` int(3) NOT NULL,
  `fecha_nota_credito` datetime NOT NULL,
  `precio_total` int(10) NOT NULL DEFAULT 0,
  `id_estado` int(2) NOT NULL,
  `es_nota_cred_electronica` smallint(6) NOT NULL DEFAULT 0,
  `url_PDF_original` varchar(255) NOT NULL DEFAULT '',
  `url_PDF_cedible` varchar(100) NOT NULL DEFAULT '',
  `id_usuario_mod` int(3) NOT NULL DEFAULT 1,
  `ult_fecha_mod` datetime DEFAULT NULL,
  `id_folio` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_nota_credito_compra`
--

CREATE TABLE `40_m_nota_credito_compra` (
  `id_nc_compra` int(10) NOT NULL,
  `id_recepcion` int(10) NOT NULL,
  `num_nc_compra` int(10) NOT NULL,
  `fecha_nc_compra` datetime NOT NULL,
  `id_tipo_docto` int(10) NOT NULL,
  `iva` int(10) NOT NULL,
  `iaba` int(10) NOT NULL,
  `espec` int(10) NOT NULL,
  `subtotal` int(10) NOT NULL,
  `precio_total` int(10) NOT NULL,
  `id_usuario` int(3) NOT NULL,
  `id_estado` int(2) NOT NULL,
  `url_PDF` varchar(255) NOT NULL,
  `cod_ref_nde` smallint(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_nota_debito`
--

CREATE TABLE `40_m_nota_debito` (
  `id_nota_debito` int(10) NOT NULL,
  `id_nota_credito` int(10) NOT NULL,
  `num_nota_debito_elect` int(10) NOT NULL,
  `rut_empresa` int(10) NOT NULL,
  `iva` int(10) NOT NULL,
  `iaba` int(10) NOT NULL,
  `espec` int(10) NOT NULL,
  `subtotal` int(10) NOT NULL,
  `id_usuario` int(3) NOT NULL,
  `fecha_nota_debito` datetime NOT NULL,
  `precio_total` int(10) NOT NULL,
  `id_estado` int(2) NOT NULL,
  `url_PDF` varchar(255) NOT NULL,
  `cod_ref_nde` smallint(6) NOT NULL,
  `id_folio` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_precio_producto`
--

CREATE TABLE `40_m_precio_producto` (
  `id_lista_precio` int(2) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `precio_neto` int(10) NOT NULL,
  `precio` int(10) NOT NULL,
  `porcen_desc` int(3) NOT NULL DEFAULT 0,
  `max_porcen_desc` int(3) NOT NULL DEFAULT 0,
  `cant_tramo1` int(4) NOT NULL DEFAULT 0,
  `max_porcen_tramo1` int(2) NOT NULL DEFAULT 0,
  `cant_tramo2` int(4) NOT NULL DEFAULT 0,
  `max_porcen_tramo2` int(2) NOT NULL DEFAULT 0,
  `cant_tramo3` int(4) NOT NULL DEFAULT 0,
  `max_porcen_tramo3` int(2) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_producto_devolucion`
--

CREATE TABLE `40_m_producto_devolucion` (
  `id_venta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_producto_venta`
--

CREATE TABLE `40_m_producto_venta` (
  `id_venta` int(10) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `precio` int(10) NOT NULL,
  `porcen_desc` int(3) NOT NULL,
  `precio_neto` int(10) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_prod_nota_credito`
--

CREATE TABLE `40_m_prod_nota_credito` (
  `id_nota_credito` int(10) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `precio` int(10) NOT NULL DEFAULT 0,
  `porcen_desc` int(3) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_prod_nota_credito_compra`
--

CREATE TABLE `40_m_prod_nota_credito_compra` (
  `id_nc_compra` int(10) NOT NULL,
  `id_producto` int(10) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `precio` int(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_ruta`
--

CREATE TABLE `40_m_ruta` (
  `id_ruta` int(6) NOT NULL,
  `nom_ruta` varchar(50) NOT NULL DEFAULT '',
  `id_usuario` int(3) NOT NULL,
  `num_dia` int(1) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_ruta_local_cliente`
--

CREATE TABLE `40_m_ruta_local_cliente` (
  `id_ruta` int(2) NOT NULL,
  `id_local_cliente` int(5) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_m_venta`
--

CREATE TABLE `40_m_venta` (
  `id_venta` int(10) NOT NULL,
  `id_lista_precio` int(2) NOT NULL,
  `id_usuario_venta` int(3) NOT NULL,
  `iva` int(10) NOT NULL DEFAULT 0,
  `iaba` int(10) NOT NULL DEFAULT 0,
  `espec` int(10) NOT NULL DEFAULT 0,
  `sub_total` int(10) NOT NULL DEFAULT 0,
  `precio_total` int(10) NOT NULL,
  `num_docto_emitido` int(10) NOT NULL,
  `id_tipo_docto_emitido` int(2) NOT NULL,
  `rut_empresa` int(10) NOT NULL,
  `rut_cliente` int(10) NOT NULL,
  `id_local_cliente` int(5) NOT NULL,
  `id_forma_pago` int(2) NOT NULL DEFAULT 0,
  `id_pedido` int(10) NOT NULL DEFAULT 0,
  `fecha_venta` datetime NOT NULL,
  `entregado` int(1) NOT NULL DEFAULT 0,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL,
  `id_folio` int(11) NOT NULL DEFAULT 0,
  `url_PDF` varchar(255) NOT NULL DEFAULT '',
  `url_PDF_original` varchar(100) NOT NULL DEFAULT '',
  `url_PDF_cedible` varchar(100) NOT NULL DEFAULT '',
  `observaciones` varchar(150) NOT NULL DEFAULT '',
  `periodo_libro` varchar(255) NOT NULL DEFAULT '',
  `id_estado_pago` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `40_p_forma_pago`
--

CREATE TABLE `40_p_forma_pago` (
  `id_forma_pago` int(2) NOT NULL,
  `nom_forma_pago` varchar(15) NOT NULL,
  `desc_forma_pago` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_bodega`
--

CREATE TABLE `50_m_bodega` (
  `id_bodega` int(2) NOT NULL,
  `nom_bodega` varchar(30) NOT NULL,
  `desc_bodega` varchar(200) NOT NULL,
  `id_tipo_bodega` int(1) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_cierre_mensual_bodega`
--

CREATE TABLE `50_m_cierre_mensual_bodega` (
  `año` int(4) NOT NULL,
  `mes` int(2) NOT NULL,
  `id_bodega` int(2) NOT NULL,
  `id_usuario_cierre` int(3) NOT NULL,
  `fecha_cierre_bodega` datetime NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_cierre_mensual_bodega_producto`
--

CREATE TABLE `50_m_cierre_mensual_bodega_producto` (
  `año` int(4) NOT NULL,
  `mes` int(2) NOT NULL,
  `id_bodega` int(2) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_mermas`
--

CREATE TABLE `50_m_mermas` (
  `id_bodega` int(2) NOT NULL,
  `fecha_merma` datetime NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `motivo_merma` varchar(255) NOT NULL,
  `id_usuario_merma` int(3) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_nivel_producto_bodega`
--

CREATE TABLE `50_m_nivel_producto_bodega` (
  `id_bodega` int(2) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `minimo` int(5) NOT NULL,
  `meses` int(2) NOT NULL,
  `punto_orden` int(5) NOT NULL,
  `id_usuario_mod` int(3) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_producto_recepcion`
--

CREATE TABLE `50_m_producto_recepcion` (
  `id_recepcion` int(10) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `valor` decimal(18,3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_recepcion_compra`
--

CREATE TABLE `50_m_recepcion_compra` (
  `id_recepcion` int(10) NOT NULL,
  `rut_proveedor` int(10) NOT NULL,
  `rut_empresa` int(10) NOT NULL,
  `id_tipo_docto` int(2) NOT NULL,
  `num_docto` int(10) NOT NULL,
  `fecha_emision_docto` datetime NOT NULL,
  `id_bodega` int(2) NOT NULL,
  `id_usuario_recepcion` int(3) NOT NULL,
  `id_estado` int(2) NOT NULL,
  `id_tipo_pago` int(11) DEFAULT NULL,
  `observacion` varchar(200) DEFAULT NULL,
  `total_neto` int(10) NOT NULL DEFAULT 0,
  `iva` int(10) NOT NULL DEFAULT 0,
  `monto_total` int(10) NOT NULL DEFAULT 0,
  `periodo_libro` varchar(7) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_m_stock`
--

CREATE TABLE `50_m_stock` (
  `id_bodega` int(2) NOT NULL,
  `id_producto` int(6) NOT NULL,
  `cantidad` decimal(18,3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `50_p_tipo_bodega`
--

CREATE TABLE `50_p_tipo_bodega` (
  `id_tipo_bodega` int(1) NOT NULL,
  `nom_tipo_bodega` varchar(15) NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `60_m_pago`
--

CREATE TABLE `60_m_pago` (
  `id_pago` int(10) NOT NULL,
  `id_venta` int(10) NOT NULL,
  `fecha` datetime NOT NULL,
  `monto` int(7) NOT NULL,
  `id_forma_pago` int(2) NOT NULL,
  `observaciones` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `70_m_proveedor`
--

CREATE TABLE `70_m_proveedor` (
  `rut_proveedor` int(10) NOT NULL,
  `dv_proveedor` varchar(1) NOT NULL,
  `razon_social` varchar(50) NOT NULL,
  `nom_fantasia` varchar(50) NOT NULL,
  `direccion_proveedor` varchar(200) NOT NULL,
  `giro` varchar(100) DEFAULT NULL,
  `fono_1` varchar(15) DEFAULT NULL,
  `fono_2` varchar(15) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `cond_pago` varchar(50) DEFAULT NULL,
  `glosa_pago` varchar(50) DEFAULT NULL,
  `nom_vendedor` varchar(200) DEFAULT NULL,
  `fono_vendedor` varchar(15) DEFAULT NULL,
  `email_vendedor` varchar(50) DEFAULT NULL,
  `observaciones` varchar(200) DEFAULT NULL,
  `id_usuario_mod` int(11) NOT NULL,
  `ult_fecha_mod` datetime NOT NULL,
  `id_estado` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `99_p_estado`
--

CREATE TABLE `99_p_estado` (
  `id_estado` int(2) NOT NULL,
  `nom_estado` varchar(15) NOT NULL,
  `desc_estado` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `99_p_estado_pago`
--

CREATE TABLE `99_p_estado_pago` (
  `id_estado_pago` tinyint(4) NOT NULL,
  `nom_estado_pago` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `99_p_impuesto`
--

CREATE TABLE `99_p_impuesto` (
  `id_impuesto` int(2) NOT NULL,
  `nom_impuesto` varchar(20) NOT NULL,
  `valor` int(3) NOT NULL,
  `id_imp_iss` int(11) NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `99_p_iva`
--

CREATE TABLE `99_p_iva` (
  `iva` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `10_m_cliente`
--
ALTER TABLE `10_m_cliente`
  ADD PRIMARY KEY (`rut_cliente`),
  ADD KEY `clie_est` (`id_estado`),
  ADD KEY `clie_list_prec` (`id_lista_precio`);

--
-- Indices de la tabla `10_m_empresa`
--
ALTER TABLE `10_m_empresa`
  ADD PRIMARY KEY (`rut_empresa`,`ult_fecha_mod`),
  ADD KEY `emp_usu` (`id_usuario_mod`),
  ADD KEY `emp_est` (`id_estado`),
  ADD KEY `rut_empresa` (`rut_empresa`);

--
-- Indices de la tabla `10_m_local_cliente`
--
ALTER TABLE `10_m_local_cliente`
  ADD PRIMARY KEY (`id_local_cliente`),
  ADD KEY `loc_clie_clie` (`rut_cliente`),
  ADD KEY `loc_clie_est` (`id_estado`);

--
-- Indices de la tabla `10_m_usuario`
--
ALTER TABLE `10_m_usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `usu_tipo_usu` (`id_tipo_usuario`),
  ADD KEY `usu_est` (`id_estado`);

--
-- Indices de la tabla `10_p_tipo_docto`
--
ALTER TABLE `10_p_tipo_docto`
  ADD PRIMARY KEY (`id_tipo_docto`);

--
-- Indices de la tabla `10_p_tipo_usuario`
--
ALTER TABLE `10_p_tipo_usuario`
  ADD PRIMARY KEY (`id_tipo_usuario`);

--
-- Indices de la tabla `20_m_porcion`
--
ALTER TABLE `20_m_porcion`
  ADD PRIMARY KEY (`id_porcion`),
  ADD KEY `fk_porcion_producto` (`id_producto`),
  ADD KEY `fk_porcion_venta` (`id_venta`),
  ADD KEY `fk_porcion_usuario` (`id_usuario`),
  ADD KEY `fk_porcion_estado` (`id_estado`);

--
-- Indices de la tabla `20_m_producto`
--
ALTER TABLE `20_m_producto`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `prod_tipo_prod` (`id_tipo_producto`),
  ADD KEY `prod_marca` (`id_marca`),
  ADD KEY `prod_UM` (`id_UM`),
  ADD KEY `prod_usu` (`id_usuario_mod`),
  ADD KEY `prod_est` (`id_estado`),
  ADD KEY `ind_serfel` (`cod_serfel`),
  ADD KEY `ind_nombre` (`nom_producto`);

--
-- Indices de la tabla `20_p_marca`
--
ALTER TABLE `20_p_marca`
  ADD PRIMARY KEY (`id_marca`);

--
-- Indices de la tabla `20_p_tipo_producto`
--
ALTER TABLE `20_p_tipo_producto`
  ADD PRIMARY KEY (`id_tipo_producto`),
  ADD KEY `niv1_tipo_pro` (`nivel_1`),
  ADD KEY `tipo_pro_usu` (`id_usuario_mod`);

--
-- Indices de la tabla `20_p_unidad_medida`
--
ALTER TABLE `20_p_unidad_medida`
  ADD PRIMARY KEY (`id_UM`);

--
-- Indices de la tabla `30_m_pedido`
--
ALTER TABLE `30_m_pedido`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `ped_loc_clie` (`id_local_cliente`),
  ADD KEY `ped_usu` (`id_usuario`),
  ADD KEY `ped_est` (`id_estado`),
  ADD KEY `ped_lis_prec` (`id_lista_precio`);

--
-- Indices de la tabla `30_m_producto_pedido`
--
ALTER TABLE `30_m_producto_pedido`
  ADD PRIMARY KEY (`id_pedido`,`id_producto`),
  ADD KEY `prod_ped_prod` (`id_producto`);

--
-- Indices de la tabla `40_m_lista_precio`
--
ALTER TABLE `40_m_lista_precio`
  ADD PRIMARY KEY (`id_lista_precio`);

--
-- Indices de la tabla `40_m_motivo_nota_credito`
--
ALTER TABLE `40_m_motivo_nota_credito`
  ADD PRIMARY KEY (`id_motivo`);

--
-- Indices de la tabla `40_m_nota_credito`
--
ALTER TABLE `40_m_nota_credito`
  ADD PRIMARY KEY (`id_nota_credito`),
  ADD KEY `nota_cred_venta` (`id_venta`),
  ADD KEY `nota_cred_usu` (`id_usuario`),
  ADD KEY `nota_cred_est` (`id_estado`);

--
-- Indices de la tabla `40_m_nota_credito_compra`
--
ALTER TABLE `40_m_nota_credito_compra`
  ADD PRIMARY KEY (`id_nc_compra`);

--
-- Indices de la tabla `40_m_nota_debito`
--
ALTER TABLE `40_m_nota_debito`
  ADD PRIMARY KEY (`id_nota_debito`);

--
-- Indices de la tabla `40_m_precio_producto`
--
ALTER TABLE `40_m_precio_producto`
  ADD PRIMARY KEY (`id_lista_precio`,`id_producto`),
  ADD KEY `prec_prod_prod` (`id_producto`);

--
-- Indices de la tabla `40_m_producto_devolucion`
--
ALTER TABLE `40_m_producto_devolucion`
  ADD PRIMARY KEY (`id_venta`,`id_producto`);

--
-- Indices de la tabla `40_m_producto_venta`
--
ALTER TABLE `40_m_producto_venta`
  ADD PRIMARY KEY (`id_venta`,`id_producto`),
  ADD KEY `prod_venta_prod` (`id_producto`);

--
-- Indices de la tabla `40_m_prod_nota_credito`
--
ALTER TABLE `40_m_prod_nota_credito`
  ADD PRIMARY KEY (`id_nota_credito`,`id_producto`),
  ADD KEY `prod_nota_prod` (`id_producto`);

--
-- Indices de la tabla `40_m_prod_nota_credito_compra`
--
ALTER TABLE `40_m_prod_nota_credito_compra`
  ADD PRIMARY KEY (`id_nc_compra`,`id_producto`),
  ADD KEY `prod_nota_prod` (`id_producto`);

--
-- Indices de la tabla `40_m_ruta`
--
ALTER TABLE `40_m_ruta`
  ADD PRIMARY KEY (`id_ruta`),
  ADD KEY `ruta_usu` (`id_usuario`),
  ADD KEY `ruta_est` (`id_estado`);

--
-- Indices de la tabla `40_m_ruta_local_cliente`
--
ALTER TABLE `40_m_ruta_local_cliente`
  ADD PRIMARY KEY (`id_ruta`,`id_local_cliente`);

--
-- Indices de la tabla `40_m_venta`
--
ALTER TABLE `40_m_venta`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `venta_lis_prec` (`id_lista_precio`),
  ADD KEY `venta_usu` (`id_usuario_venta`),
  ADD KEY `venta_tipo_docto` (`id_tipo_docto_emitido`),
  ADD KEY `venta_emp` (`rut_empresa`),
  ADD KEY `venta_clie` (`rut_cliente`),
  ADD KEY `venta_ped` (`id_pedido`),
  ADD KEY `venta_est` (`id_estado`),
  ADD KEY `IDX_idLocalClienteFechaVenta` (`id_local_cliente`,`fecha_venta`);

--
-- Indices de la tabla `40_p_forma_pago`
--
ALTER TABLE `40_p_forma_pago`
  ADD PRIMARY KEY (`id_forma_pago`);

--
-- Indices de la tabla `50_m_bodega`
--
ALTER TABLE `50_m_bodega`
  ADD PRIMARY KEY (`id_bodega`),
  ADD KEY `bod_tipo_bod` (`id_tipo_bodega`),
  ADD KEY `bod_usu_mod` (`id_usuario_mod`),
  ADD KEY `bod_est` (`id_estado`);

--
-- Indices de la tabla `50_m_cierre_mensual_bodega`
--
ALTER TABLE `50_m_cierre_mensual_bodega`
  ADD PRIMARY KEY (`año`,`mes`,`id_bodega`),
  ADD KEY `cierre_bod_bod` (`id_bodega`),
  ADD KEY `cierre_bod_usu` (`id_usuario_cierre`),
  ADD KEY `mes` (`mes`);

--
-- Indices de la tabla `50_m_cierre_mensual_bodega_producto`
--
ALTER TABLE `50_m_cierre_mensual_bodega_producto`
  ADD PRIMARY KEY (`año`,`mes`,`id_bodega`,`id_producto`),
  ADD KEY `bod_cierre_bod_prod` (`id_bodega`),
  ADD KEY `prod_cierre_bod_prod` (`id_producto`),
  ADD KEY `mes_cierre_bod_prod` (`mes`);

--
-- Indices de la tabla `50_m_mermas`
--
ALTER TABLE `50_m_mermas`
  ADD PRIMARY KEY (`id_bodega`,`fecha_merma`,`id_producto`),
  ADD KEY `merma_prod` (`id_producto`);

--
-- Indices de la tabla `50_m_nivel_producto_bodega`
--
ALTER TABLE `50_m_nivel_producto_bodega`
  ADD PRIMARY KEY (`id_bodega`,`id_producto`),
  ADD KEY `niv_prod` (`id_producto`);

--
-- Indices de la tabla `50_m_producto_recepcion`
--
ALTER TABLE `50_m_producto_recepcion`
  ADD PRIMARY KEY (`id_recepcion`,`id_producto`),
  ADD KEY `prod_recep_prod` (`id_producto`);

--
-- Indices de la tabla `50_m_recepcion_compra`
--
ALTER TABLE `50_m_recepcion_compra`
  ADD PRIMARY KEY (`id_recepcion`),
  ADD KEY `recep_prov` (`rut_proveedor`),
  ADD KEY `recep_tipo_docto` (`id_tipo_docto`),
  ADD KEY `recep_bod` (`id_bodega`),
  ADD KEY `recep_usu` (`id_usuario_recepcion`),
  ADD KEY `recep_est` (`id_estado`);

--
-- Indices de la tabla `50_m_stock`
--
ALTER TABLE `50_m_stock`
  ADD PRIMARY KEY (`id_bodega`,`id_producto`),
  ADD KEY `stock_prod` (`id_producto`);

--
-- Indices de la tabla `50_p_tipo_bodega`
--
ALTER TABLE `50_p_tipo_bodega`
  ADD PRIMARY KEY (`id_tipo_bodega`);

--
-- Indices de la tabla `60_m_pago`
--
ALTER TABLE `60_m_pago`
  ADD PRIMARY KEY (`id_pago`),
  ADD KEY `fk_pago_venta` (`id_venta`),
  ADD KEY `fk_pago_tipo_docto` (`id_forma_pago`);

--
-- Indices de la tabla `70_m_proveedor`
--
ALTER TABLE `70_m_proveedor`
  ADD PRIMARY KEY (`rut_proveedor`),
  ADD KEY `prov_usu` (`id_usuario_mod`),
  ADD KEY `prov_est` (`id_estado`);

--
-- Indices de la tabla `99_p_estado`
--
ALTER TABLE `99_p_estado`
  ADD PRIMARY KEY (`id_estado`);

--
-- Indices de la tabla `99_p_estado_pago`
--
ALTER TABLE `99_p_estado_pago`
  ADD PRIMARY KEY (`id_estado_pago`);

--
-- Indices de la tabla `99_p_impuesto`
--
ALTER TABLE `99_p_impuesto`
  ADD PRIMARY KEY (`id_impuesto`);

--
-- Indices de la tabla `99_p_iva`
--
ALTER TABLE `99_p_iva`
  ADD PRIMARY KEY (`iva`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `20_m_porcion`
--
ALTER TABLE `20_m_porcion`
  MODIFY `id_porcion` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `40_m_nota_credito_compra`
--
ALTER TABLE `40_m_nota_credito_compra`
  MODIFY `id_nc_compra` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `40_m_nota_debito`
--
ALTER TABLE `40_m_nota_debito`
  MODIFY `id_nota_debito` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `40_m_prod_nota_credito_compra`
--
ALTER TABLE `40_m_prod_nota_credito_compra`
  MODIFY `id_nc_compra` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `60_m_pago`
--
ALTER TABLE `60_m_pago`
  MODIFY `id_pago` int(10) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `10_m_cliente`
--
ALTER TABLE `10_m_cliente`
  ADD CONSTRAINT `clie_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `clie_list_prec` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio` (`id_lista_precio`);

--
-- Filtros para la tabla `10_m_empresa`
--
ALTER TABLE `10_m_empresa`
  ADD CONSTRAINT `emp_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `emp_usu` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `10_m_local_cliente`
--
ALTER TABLE `10_m_local_cliente`
  ADD CONSTRAINT `loc_clie_clie` FOREIGN KEY (`rut_cliente`) REFERENCES `10_m_cliente` (`rut_cliente`),
  ADD CONSTRAINT `loc_clie_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`);

--
-- Filtros para la tabla `10_m_usuario`
--
ALTER TABLE `10_m_usuario`
  ADD CONSTRAINT `usu_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `usu_tipo_usu` FOREIGN KEY (`id_tipo_usuario`) REFERENCES `10_p_tipo_usuario` (`id_tipo_usuario`);

--
-- Filtros para la tabla `20_m_porcion`
--
ALTER TABLE `20_m_porcion`
  ADD CONSTRAINT `fk_porcion_estado` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_porcion_producto` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_porcion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_porcion_venta` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta` (`id_venta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `20_m_producto`
--
ALTER TABLE `20_m_producto`
  ADD CONSTRAINT `prod_UM` FOREIGN KEY (`id_UM`) REFERENCES `20_p_unidad_medida` (`id_UM`),
  ADD CONSTRAINT `prod_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `prod_marca` FOREIGN KEY (`id_marca`) REFERENCES `20_p_marca` (`id_marca`),
  ADD CONSTRAINT `prod_tipo_prod` FOREIGN KEY (`id_tipo_producto`) REFERENCES `20_p_tipo_producto` (`id_tipo_producto`),
  ADD CONSTRAINT `prod_usu` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `20_p_tipo_producto`
--
ALTER TABLE `20_p_tipo_producto`
  ADD CONSTRAINT `tipo_pro_usu` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `30_m_pedido`
--
ALTER TABLE `30_m_pedido`
  ADD CONSTRAINT `ped_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `ped_lis_prec` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio` (`id_lista_precio`),
  ADD CONSTRAINT `ped_loc_clie` FOREIGN KEY (`id_local_cliente`) REFERENCES `10_m_local_cliente` (`id_local_cliente`),
  ADD CONSTRAINT `ped_usu` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `30_m_producto_pedido`
--
ALTER TABLE `30_m_producto_pedido`
  ADD CONSTRAINT `prod_ped_ped` FOREIGN KEY (`id_pedido`) REFERENCES `30_m_pedido` (`id_pedido`),
  ADD CONSTRAINT `prod_ped_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `40_m_nota_credito`
--
ALTER TABLE `40_m_nota_credito`
  ADD CONSTRAINT `nota_cred_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `nota_cred_usu` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario` (`id_usuario`),
  ADD CONSTRAINT `nota_cred_venta` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta` (`id_venta`);

--
-- Filtros para la tabla `40_m_precio_producto`
--
ALTER TABLE `40_m_precio_producto`
  ADD CONSTRAINT `prec_prod_list_prec` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio` (`id_lista_precio`),
  ADD CONSTRAINT `prec_prod_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `40_m_producto_venta`
--
ALTER TABLE `40_m_producto_venta`
  ADD CONSTRAINT `prod_venta_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`),
  ADD CONSTRAINT `prod_venta_venta` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta` (`id_venta`);

--
-- Filtros para la tabla `40_m_prod_nota_credito`
--
ALTER TABLE `40_m_prod_nota_credito`
  ADD CONSTRAINT `prod_nota_nota_cred` FOREIGN KEY (`id_nota_credito`) REFERENCES `40_m_nota_credito` (`id_nota_credito`),
  ADD CONSTRAINT `prod_nota_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `40_m_ruta`
--
ALTER TABLE `40_m_ruta`
  ADD CONSTRAINT `ruta_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `ruta_usu` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `40_m_venta`
--
ALTER TABLE `40_m_venta`
  ADD CONSTRAINT `venta_clie` FOREIGN KEY (`rut_cliente`) REFERENCES `10_m_cliente` (`rut_cliente`),
  ADD CONSTRAINT `venta_emp` FOREIGN KEY (`rut_empresa`) REFERENCES `10_m_empresa` (`rut_empresa`),
  ADD CONSTRAINT `venta_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `venta_lis_prec` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio` (`id_lista_precio`),
  ADD CONSTRAINT `venta_ped` FOREIGN KEY (`id_pedido`) REFERENCES `30_m_pedido` (`id_pedido`),
  ADD CONSTRAINT `venta_tipo_docto` FOREIGN KEY (`id_tipo_docto_emitido`) REFERENCES `10_p_tipo_docto` (`id_tipo_docto`),
  ADD CONSTRAINT `venta_usu` FOREIGN KEY (`id_usuario_venta`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `50_m_bodega`
--
ALTER TABLE `50_m_bodega`
  ADD CONSTRAINT `bod_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `bod_tipo_bod` FOREIGN KEY (`id_tipo_bodega`) REFERENCES `50_p_tipo_bodega` (`id_tipo_bodega`),
  ADD CONSTRAINT `bod_usu_mod` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `50_m_cierre_mensual_bodega`
--
ALTER TABLE `50_m_cierre_mensual_bodega`
  ADD CONSTRAINT `cierre_bod_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega` (`id_bodega`),
  ADD CONSTRAINT `cierre_bod_usu` FOREIGN KEY (`id_usuario_cierre`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `50_m_cierre_mensual_bodega_producto`
--
ALTER TABLE `50_m_cierre_mensual_bodega_producto`
  ADD CONSTRAINT `año_cierre_bod_prod` FOREIGN KEY (`año`,`mes`,`id_bodega`) REFERENCES `50_m_cierre_mensual_bodega` (`año`, `mes`, `id_bodega`),
  ADD CONSTRAINT `prod_cierre_bod_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `50_m_mermas`
--
ALTER TABLE `50_m_mermas`
  ADD CONSTRAINT `merma_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega` (`id_bodega`),
  ADD CONSTRAINT `merma_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `50_m_nivel_producto_bodega`
--
ALTER TABLE `50_m_nivel_producto_bodega`
  ADD CONSTRAINT `niv_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega` (`id_bodega`),
  ADD CONSTRAINT `niv_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `50_m_producto_recepcion`
--
ALTER TABLE `50_m_producto_recepcion`
  ADD CONSTRAINT `prod_recep_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`),
  ADD CONSTRAINT `prod_recep_recep` FOREIGN KEY (`id_recepcion`) REFERENCES `50_m_recepcion_compra` (`id_recepcion`);

--
-- Filtros para la tabla `50_m_recepcion_compra`
--
ALTER TABLE `50_m_recepcion_compra`
  ADD CONSTRAINT `recep_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega` (`id_bodega`),
  ADD CONSTRAINT `recep_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `recep_prov` FOREIGN KEY (`rut_proveedor`) REFERENCES `70_m_proveedor` (`rut_proveedor`),
  ADD CONSTRAINT `recep_tipo_docto` FOREIGN KEY (`id_tipo_docto`) REFERENCES `10_p_tipo_docto` (`id_tipo_docto`),
  ADD CONSTRAINT `recep_usu` FOREIGN KEY (`id_usuario_recepcion`) REFERENCES `10_m_usuario` (`id_usuario`);

--
-- Filtros para la tabla `50_m_stock`
--
ALTER TABLE `50_m_stock`
  ADD CONSTRAINT `stock_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega` (`id_bodega`),
  ADD CONSTRAINT `stock_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto` (`id_producto`);

--
-- Filtros para la tabla `60_m_pago`
--
ALTER TABLE `60_m_pago`
  ADD CONSTRAINT `fk_pago_tipo_docto` FOREIGN KEY (`id_forma_pago`) REFERENCES `10_p_tipo_docto` (`id_tipo_docto`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pago_venta` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta` (`id_venta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `70_m_proveedor`
--
ALTER TABLE `70_m_proveedor`
  ADD CONSTRAINT `prov_est` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado` (`id_estado`),
  ADD CONSTRAINT `prov_usu` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario` (`id_usuario`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
