# Tramos de descuento por volumen en el modal de detalle de producto (legacy)

**Fecha:** 2026-08-18
**Ámbito:** `apps/legacy-frontend` (Angular 14 vendored) + backend PHP `legacy-php` (SerfelWeb → `Distribuidor/Clases`, CoproadWeb → `Coproad/Clases`).

## Problema

La tabla `40_m_precio_producto` define, por producto y lista de precio, un techo
de descuento base (`max_porcen_desc`) y hasta tres tramos de descuento por
volumen: `cant_tramoN` / `max_porcen_tramoN` (N = 1..3, cantidades ascendentes).
Un tramo está **activo** sólo cuando `cant_tramoN > 0`.

Hoy, al crear o modificar un pedido, el modal de detalle de producto:

1. No informa al usuario de la existencia de estos tramos.
2. Valida el `% Desc` ingresado contra un techo fijo (`maxPorcenDesc`), ignorando
   que a mayor cantidad se permite un descuento mayor.

Los datos de tramos ya viajan casi todo el camino pero se pierden en el Mapper,
por lo que el frontend nunca los recibe.

## Semántica del techo efectivo

Para una cantidad dada, el techo de descuento efectivo es:

- Base = `maxPorcenDesc` (aplica cuando la cantidad está por debajo del tramo 1).
- Para cada tramo N = 1..3 **activo** (`cantTramoN > 0`), en orden ascendente: si
  `cantidad >= cantTramoN`, el techo pasa a ser `maxPorcenTramoN`. Gana el tramo
  más alto alcanzado.

> Nota: la columna `porcen_desc` de `40_m_precio_producto` está muerta y no debe
> leerse ni escribirse. El techo real es `max_porcen_desc` + los tramos.

## Trazado de datos actual

### Flujo crear pedido (lista de precios)
`PrecioService.preciosProductoPorLista` → `PrecioProductoREST/list` →
`PrecioProductoNEG::listPrecioProducto` → `PrecioProductoDAO::listPrecioProducto`
→ POJO `RegListPrecioProducto` → `PrecioProductoMapper::fromEntitysToDTOs`.

- El DAO **ya** hace `SELECT` de las seis columnas de tramo.
- El POJO `RegListPrecioProducto` **ya** tiene las seis propiedades de tramo.
- El Mapper **descarta** los tramos (no los copia al DTO). ← punto a corregir.

### Flujo modificar pedido (líneas de un pedido guardado)
`PedidoREST/order` → `PedidoNEG::findOrder` →
`ProductoPedidoDAO::listProductoPedidoComoRegListProductoPedido` → POJO
`RegListProductoPedido` → `PrecioProductoMapper::fromEntitysToDTOs`.

- El DAO **no** selecciona los tramos hoy (aunque su query **ya** hace
  `INNER JOIN 40_m_precio_producto pp`).
- El POJO `RegListProductoPedido` **no** tiene las propiedades de tramo.
- Mismo Mapper que el flujo crear.

Ambos flujos comparten el mismo modal en el frontend
(`ModalDetalleProductoComponent`, usado por `crear-pedido` y `modificar-pedido`).

## Diseño

### Backend PHP — replicar en `Distribuidor/Clases` (Serfel) y `Coproad/Clases` (Coproad)

Los dos árboles de clases son idénticos en las partes afectadas; todos los
cambios se aplican por igual en ambos.

**1. `Mapper/PrecioProductoMapper.php` — `fromEntityToDTO`**
Añadir las seis claves de tramo al DTO, tras `maxPorcenDesc`:

```php
$dto['cantTramo1']      = $producto->cant_tramo1;
$dto['maxPorcenTramo1'] = $producto->max_porcen_tramo1;
$dto['cantTramo2']      = $producto->cant_tramo2;
$dto['maxPorcenTramo2'] = $producto->max_porcen_tramo2;
$dto['cantTramo3']      = $producto->cant_tramo3;
$dto['maxPorcenTramo3'] = $producto->max_porcen_tramo3;
```

Sirve a ambos flujos: los POJO `RegListPrecioProducto` (crear) y
`RegListProductoPedido` (modificar) expondrán las mismas propiedades.

**2. `POJO/RegListProductoPedido.php`**
Añadir las seis propiedades públicas de tramo (`cant_tramo1`,
`max_porcen_tramo1`, ... `max_porcen_tramo3`), igual que ya las tiene
`RegListPrecioProducto`.

**3. `DAO/ProductoPedidoDAO.php` — `listProductoPedidoComoRegListProductoPedido`**
Añadir al `SELECT` (la query ya une `40_m_precio_producto pp`):

```sql
pp.cant_tramo1,
pp.max_porcen_tramo1,
pp.cant_tramo2,
pp.max_porcen_tramo2,
pp.cant_tramo3,
pp.max_porcen_tramo3
```

Sin cambios en `PrecioProductoDAO` ni en `RegListPrecioProducto` (ya traen los
tramos).

### Frontend — `apps/legacy-frontend`

**4. `models/precio-producto.model.ts`**
Añadir seis campos opcionales: `cantTramo1..3`, `maxPorcenTramo1..3` (number).

**5. `pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.ts`**
- Construir una lista de tramos activos a mostrar (los que tienen
  `cantTramoN > 0`), en orden ascendente.
- `getTechoEfectivo(cantidad)`: implementa la semántica del techo efectivo.
- `tieneTramos`: verdadero si hay al menos un tramo activo (controla si se
  muestra el bloque informativo).
- Estado para la UI: techo efectivo actual y cuál tramo (o base) está activo,
  para resaltarlo.
- Al **cambiar la cantidad** (handler de `ngModelChange`):
  - Recalcular el techo efectivo y actualizar la etiqueta "aplica" y el
    resaltado del tramo activo **en ambos sentidos** (subir o bajar cantidad).
  - **Auto-clamp**: si el `% Desc` ingresado supera el techo efectivo nuevo,
    bajarlo hasta ese techo. Como al subir la cantidad el techo sólo sube, el
    valor ingresado nunca se toca al aumentar cantidad; sólo se recorta cuando
    el techo baja. (El resaltado/etiqueta sí es puramente visual y refleja el
    estado real en todo momento.)
- Al **Agregar** (`ingresarDetalleProducto`): reemplazar la comparación fija
  `porcenDesc > maxPorcenDesc` por `porcenDesc > getTechoEfectivo(cantidad)`. El
  `alert` muestra el máximo aplicable a la cantidad ingresada. Se valida siempre
  en Agregar, independientemente del auto-clamp.

**6. `modal-detalle-producto.component.html`**
- Bloque informativo (visible sólo si `tieneTramos`):
  - Etiqueta `% Desc máx (aplica): N%` con el techo efectivo actual.
  - Línea de tramos: `Desde 10 uds: 5% · Desde 50 uds: 8% · Desde 100 uds: 10%`,
    con el tramo aplicable a la cantidad actual en **negrita**. Cuando aplica la
    base (cantidad bajo el tramo 1), ningún tramo va en negrita y la etiqueta
    "aplica" muestra `maxPorcenDesc`.
- Añadir `(ngModelChange)` al input de cantidad para disparar el recálculo.

### Backend — creación de pedido: sin cambios

`PedidoNEG::crearPedido` (y `modPedido`) **no** realizan ninguna validación de
descuento: insertan las líneas tal cual. Conforme a lo pedido, si no hay
validación existente, no se agrega ni se modifica. La validación permanece
íntegramente en el modal del cliente.

## Aislamiento y pruebas

- Cambios puramente aditivos: no hay endpoints nuevos ni cambios de contrato que
  rompan consumidores existentes (los campos nuevos son opcionales).
- Verificación manual en el modal:
  - Producto sin tramos activos → no aparece el bloque; el techo sigue siendo
    `maxPorcenDesc` (comportamiento actual).
  - Producto con tramos → la etiqueta "aplica" y el resaltado cambian al variar
    la cantidad; bajar la cantidad recorta el `% Desc`; Agregar rechaza cuando
    el `% Desc` supera el techo de la cantidad ingresada.
  - Flujo modificar: reabrir una línea existente muestra los tramos (gracias al
    cambio en `RegListProductoPedido` + DAO).
- Paridad Serfel/Coproad: aplicar y probar los mismos cambios en ambos árboles
  de clases.

## Archivos afectados

Backend (x2: `Distribuidor/Clases` y `Coproad/Clases`):
- `Mapper/PrecioProductoMapper.php`
- `POJO/RegListProductoPedido.php`
- `DAO/ProductoPedidoDAO.php`

Frontend (`apps/legacy-frontend/src/app`):
- `models/precio-producto.model.ts`
- `pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.ts`
- `pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.html`
