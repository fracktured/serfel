# Tramos de Descuento en el Modal de Detalle de Producto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface each product's volume-discount tiers (tramos) in the legacy order-detail modal and cap the entered discount by the tier that the entered quantity unlocks, in both the create and modify order flows, for Serfel and Coproad.

**Architecture:** The tramo columns already live in `40_m_precio_producto` and are already selected by the price-list query. Backend work is additive plumbing: expose the six tramo fields through the PHP DTO Mapper (both flows), and add them to the order-line POJO + query (modify flow). Frontend work adds the fields to the Angular model and implements a pure ceiling function plus reactive UI in the shared `ModalDetalleProductoComponent`.

**Tech Stack:** PHP 5.6 (CodeIgniter REST, `legacy-php/`), Angular 14 vendored (`apps/legacy-frontend/`, TypeScript, `@ng-bootstrap`), Karma/Jasmine (Node 16, browser).

## Global Constraints

- Legacy frontend builds/tests run with **Node 16** and `export NODE_OPTIONS=--openssl-legacy-provider` (see `apps/legacy-frontend/CLAUDE.md`). All `ng` commands below assume both.
- **`porcen_desc` (in `40_m_precio_producto`) is a dead column** — never read or write it. The discount ceiling is `max_porcen_desc` plus the tramos.
- Tramo N (N=1..3) is **active only when `cant_tramoN > 0`**; tramos are ascending in quantity.
- All backend edits are applied **identically in two class trees**: `legacy-php/Distribuidor/Clases/` (Serfel) and `legacy-php/Coproad/Clases/` (Coproad).
- Changes are **purely additive** — new DTO keys and optional model fields, no contract removals.
- Backend order creation (`PedidoNEG::crearPedido`/`modPedido`) has **no** discount validation today and must stay unchanged; validation lives only in the modal.
- Do not use em dashes in code identifiers or SQL.

---

### Task 1: Backend PHP — expose tramos in DTO and order-line query (both trees)

Applies to **both** `legacy-php/Distribuidor/Clases/` and `legacy-php/Coproad/Clases/`. The two trees are byte-identical in the affected regions; make the same edit in each.

**Files:**
- Modify: `legacy-php/Distribuidor/Clases/Mapper/PrecioProductoMapper.php` (after the `maxPorcenDesc` assignment, ~line 24)
- Modify: `legacy-php/Distribuidor/Clases/POJO/RegListProductoPedido.php` (after `$max_porcen_desc`, ~line 22)
- Modify: `legacy-php/Distribuidor/Clases/DAO/ProductoPedidoDAO.php` (in `listProductoPedidoComoRegListProductoPedido`, the `SELECT` list ~line 94)
- Modify: `legacy-php/Coproad/Clases/Mapper/PrecioProductoMapper.php` (same relative location)
- Modify: `legacy-php/Coproad/Clases/POJO/RegListProductoPedido.php` (same relative location)
- Modify: `legacy-php/Coproad/Clases/DAO/ProductoPedidoDAO.php` (same relative location)

**Interfaces:**
- Produces: DTO from `PrecioProductoMapper::fromEntityToDTO` now carries keys
  `cantTramo1, maxPorcenTramo1, cantTramo2, maxPorcenTramo2, cantTramo3, maxPorcenTramo3`
  (integers). These become JSON fields `cantTramo1..3` / `maxPorcenTramo1..3` consumed by the frontend model in Task 2.
- Note: `PrecioProductoDAO::listPrecioProducto` and POJO `RegListPrecioProducto` already carry these columns (create flow); no change needed there.

- [ ] **Step 1: Add tramo keys to the Mapper DTO (Distribuidor)**

In `legacy-php/Distribuidor/Clases/Mapper/PrecioProductoMapper.php`, insert immediately after the line `$dto['maxPorcenDesc'] = $producto->max_porcen_desc;` and before the `if ( !empty( $producto->id_pedido ) ) {` block:

```php
        $dto['cantTramo1']      = $producto->cant_tramo1;
        $dto['maxPorcenTramo1'] = $producto->max_porcen_tramo1;
        $dto['cantTramo2']      = $producto->cant_tramo2;
        $dto['maxPorcenTramo2'] = $producto->max_porcen_tramo2;
        $dto['cantTramo3']      = $producto->cant_tramo3;
        $dto['maxPorcenTramo3'] = $producto->max_porcen_tramo3;
```

- [ ] **Step 2: Add tramo properties to the order-line POJO (Distribuidor)**

In `legacy-php/Distribuidor/Clases/POJO/RegListProductoPedido.php`, insert after `public $max_porcen_desc;` and before the closing `}`:

```php
    public $cant_tramo1;
    public $max_porcen_tramo1;
    public $cant_tramo2;
    public $max_porcen_tramo2;
    public $cant_tramo3;
    public $max_porcen_tramo3;
```

- [ ] **Step 3: Add tramo columns to the order-line query (Distribuidor)**

In `legacy-php/Distribuidor/Clases/DAO/ProductoPedidoDAO.php`, inside `listProductoPedidoComoRegListProductoPedido`, change the SELECT tail. Replace:

```sql
                    pp.max_porcen_desc
             FROM 30_m_producto_pedido ppe
```

with:

```sql
                    pp.max_porcen_desc,
                    pp.cant_tramo1,
                    pp.max_porcen_tramo1,
                    pp.cant_tramo2,
                    pp.max_porcen_tramo2,
                    pp.cant_tramo3,
                    pp.max_porcen_tramo3
             FROM 30_m_producto_pedido ppe
```

(The query already `INNER JOIN 40_m_precio_producto pp`, so no join change is needed.)

- [ ] **Step 4: Mirror Steps 1-3 in the Coproad tree**

Apply the exact same three edits to:
- `legacy-php/Coproad/Clases/Mapper/PrecioProductoMapper.php`
- `legacy-php/Coproad/Clases/POJO/RegListProductoPedido.php`
- `legacy-php/Coproad/Clases/DAO/ProductoPedidoDAO.php`

- [ ] **Step 5: Verify PHP syntax and confirm edits landed**

Run (php CLI is optional; skip the first command if `php` is unavailable):

```bash
for f in \
  legacy-php/Distribuidor/Clases/Mapper/PrecioProductoMapper.php \
  legacy-php/Distribuidor/Clases/POJO/RegListProductoPedido.php \
  legacy-php/Distribuidor/Clases/DAO/ProductoPedidoDAO.php \
  legacy-php/Coproad/Clases/Mapper/PrecioProductoMapper.php \
  legacy-php/Coproad/Clases/POJO/RegListProductoPedido.php \
  legacy-php/Coproad/Clases/DAO/ProductoPedidoDAO.php; do
  php -l "$f" 2>/dev/null || echo "php CLI not available, skipping lint for $f"
done

grep -c "maxPorcenTramo3" \
  legacy-php/Distribuidor/Clases/Mapper/PrecioProductoMapper.php \
  legacy-php/Coproad/Clases/Mapper/PrecioProductoMapper.php
grep -c "max_porcen_tramo3" \
  legacy-php/Distribuidor/Clases/POJO/RegListProductoPedido.php \
  legacy-php/Distribuidor/Clases/DAO/ProductoPedidoDAO.php \
  legacy-php/Coproad/Clases/POJO/RegListProductoPedido.php \
  legacy-php/Coproad/Clases/DAO/ProductoPedidoDAO.php
```

Expected: no `php -l` errors (or the "not available" note), and every `grep -c` prints `1` for each file.

- [ ] **Step 6: Commit**

```bash
git add legacy-php/Distribuidor/Clases legacy-php/Coproad/Clases
git commit -m "feat(pedidos): expose precio-producto tramos through PHP DTO and order-line query"
```

---

### Task 2: Frontend — pure ceiling logic + model fields (unit tested)

**Files:**
- Modify: `apps/legacy-frontend/src/app/models/precio-producto.model.ts`
- Create: `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.ts`
- Create: `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.spec.ts`

**Interfaces:**
- Consumes: JSON fields `cantTramo1..3` / `maxPorcenTramo1..3` produced by Task 1.
- Produces (imported by Task 3):
  - `interface TramoPricing { maxPorcenDesc: number; cantTramo1?: number; maxPorcenTramo1?: number; cantTramo2?: number; maxPorcenTramo2?: number; cantTramo3?: number; maxPorcenTramo3?: number; }`
  - `interface Tramo { cant: number; max: number; }`
  - `getTramosActivos(p: TramoPricing): Tramo[]` — active tiers (`cant > 0`), ascending.
  - `getTechoEfectivo(p: TramoPricing, cantidad: number): number` — effective ceiling.
  - `getTramoActivoCant(p: TramoPricing, cantidad: number): number | null` — the `cant` of the highest reached active tier, or `null` when the base ceiling applies.

- [ ] **Step 1: Add optional tramo fields to the model**

In `apps/legacy-frontend/src/app/models/precio-producto.model.ts`, add after `public maxPorcenDesc: number;`:

```typescript
    public cantTramo1?: number;
    public maxPorcenTramo1?: number;
    public cantTramo2?: number;
    public maxPorcenTramo2?: number;
    public cantTramo3?: number;
    public maxPorcenTramo3?: number;
```

- [ ] **Step 2: Write the failing test for the tramo helpers**

Create `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.spec.ts`:

```typescript
import { getTechoEfectivo, getTramosActivos, getTramoActivoCant, TramoPricing } from './tramos';

const conTramos: TramoPricing = {
  maxPorcenDesc: 3,
  cantTramo1: 10, maxPorcenTramo1: 5,
  cantTramo2: 50, maxPorcenTramo2: 8,
  cantTramo3: 100, maxPorcenTramo3: 10,
};

const sinTramos: TramoPricing = {
  maxPorcenDesc: 4,
  cantTramo1: 0, maxPorcenTramo1: 0,
  cantTramo2: 0, maxPorcenTramo2: 0,
  cantTramo3: 0, maxPorcenTramo3: 0,
};

describe('tramos helpers', () => {
  it('lists only active tramos, ascending', () => {
    expect(getTramosActivos(conTramos)).toEqual([
      { cant: 10, max: 5 },
      { cant: 50, max: 8 },
      { cant: 100, max: 10 },
    ]);
    expect(getTramosActivos(sinTramos)).toEqual([]);
  });

  it('returns base ceiling below the first tramo', () => {
    expect(getTechoEfectivo(conTramos, 0)).toBe(3);
    expect(getTechoEfectivo(conTramos, 9)).toBe(3);
  });

  it('returns the highest reached tramo ceiling', () => {
    expect(getTechoEfectivo(conTramos, 10)).toBe(5);
    expect(getTechoEfectivo(conTramos, 49)).toBe(5);
    expect(getTechoEfectivo(conTramos, 50)).toBe(8);
    expect(getTechoEfectivo(conTramos, 100)).toBe(10);
    expect(getTechoEfectivo(conTramos, 999)).toBe(10);
  });

  it('falls back to base ceiling when no tramos are active', () => {
    expect(getTechoEfectivo(sinTramos, 500)).toBe(4);
  });

  it('reports the active tramo cant, or null at base', () => {
    expect(getTramoActivoCant(conTramos, 9)).toBeNull();
    expect(getTramoActivoCant(conTramos, 10)).toBe(10);
    expect(getTramoActivoCant(conTramos, 60)).toBe(50);
    expect(getTramoActivoCant(sinTramos, 60)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
cd apps/legacy-frontend && export NODE_OPTIONS=--openssl-legacy-provider && \
  npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — cannot find module `./tramos`. (If ChromeHeadless is unavailable in the environment, note it and rely on Step 5's build; but attempt the run first.)

- [ ] **Step 4: Implement the tramo helpers**

Create `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.ts`:

```typescript
export interface TramoPricing {
  maxPorcenDesc: number;
  cantTramo1?: number;
  maxPorcenTramo1?: number;
  cantTramo2?: number;
  maxPorcenTramo2?: number;
  cantTramo3?: number;
  maxPorcenTramo3?: number;
}

export interface Tramo {
  cant: number;
  max: number;
}

function todosLosTramos(p: TramoPricing): Tramo[] {
  return [
    { cant: Number(p.cantTramo1) || 0, max: Number(p.maxPorcenTramo1) || 0 },
    { cant: Number(p.cantTramo2) || 0, max: Number(p.maxPorcenTramo2) || 0 },
    { cant: Number(p.cantTramo3) || 0, max: Number(p.maxPorcenTramo3) || 0 },
  ];
}

export function getTramosActivos(p: TramoPricing): Tramo[] {
  return todosLosTramos(p).filter(t => t.cant > 0);
}

export function getTechoEfectivo(p: TramoPricing, cantidad: number): number {
  let techo = Number(p.maxPorcenDesc) || 0;
  const qty = Number(cantidad) || 0;
  for (const t of getTramosActivos(p)) {
    if (qty >= t.cant) {
      techo = t.max;
    }
  }
  return techo;
}

export function getTramoActivoCant(p: TramoPricing, cantidad: number): number | null {
  let activo: number | null = null;
  const qty = Number(cantidad) || 0;
  for (const t of getTramosActivos(p)) {
    if (qty >= t.cant) {
      activo = t.cant;
    }
  }
  return activo;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
cd apps/legacy-frontend && export NODE_OPTIONS=--openssl-legacy-provider && \
  npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (all specs green). If the browser runner cannot start in this environment, instead verify compilation with `npx tsc --noEmit -p tsconfig.app.json` and record that the Karma run must be executed on a Node 16 + Chrome host.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-frontend/src/app/models/precio-producto.model.ts \
        apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.ts \
        apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/tramos.spec.ts
git commit -m "feat(pedidos): add tramo model fields and pure discount-ceiling helpers"
```

---

### Task 3: Frontend — wire tramo logic into the modal (component + template)

**Files:**
- Modify: `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.ts`
- Modify: `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.html`

**Interfaces:**
- Consumes: `getTramosActivos`, `getTechoEfectivo`, `getTramoActivoCant`, `Tramo` from `./tramos` (Task 2); tramo fields on `PrecioProductoModel`.
- Produces: no exports; final integrated UI.

- [ ] **Step 1: Update the component class**

Replace the entire body of `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.ts` with:

```typescript
import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PrecioProductoModel } from '../../../models/precio-producto.model';
import { getTramosActivos, getTechoEfectivo, getTramoActivoCant, Tramo } from './tramos';

@Component({
  selector: 'app-modal-detalle-producto',
  templateUrl: './modal-detalle-producto.component.html',
  styleUrls: ['./modal-detalle-producto.component.css']
})
export class ModalDetalleProductoComponent implements OnInit {

  @Input() producto: PrecioProductoModel;

  tramos: Tramo[] = [];
  tieneTramos = false;
  techoEfectivo = 0;
  tramoActivoCant: number | null = null;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    this.tramos = getTramosActivos(this.producto);
    this.tieneTramos = this.tramos.length > 0;
    this.recalcularTecho();
  }

  onCantidadChange(): void {
    this.recalcularTecho();
    const porcen = Number(this.producto.porcenDesc);
    if (!isNaN(porcen) && porcen > this.techoEfectivo) {
      this.producto.porcenDesc = this.techoEfectivo;
    }
  }

  private recalcularTecho(): void {
    const cantidad = Number(this.producto.cantidad) || 0;
    this.techoEfectivo = getTechoEfectivo(this.producto, cantidad);
    this.tramoActivoCant = getTramoActivoCant(this.producto, cantidad);
  }

  ingresarDetalleProducto() {
    if ( this.producto.cantidad === undefined || !(this.producto.cantidad > 0) ) {
      alert('Cantidad debe ser mayor a 0');
      return;
    }

    if ( this.producto.porcenDesc === undefined || !( this.producto.porcenDesc > 0 ) ) {
      this.producto.porcenDesc = 0;
    }

    this.producto.porcenDesc = parseInt(this.producto.porcenDesc.toString());
    this.producto.maxPorcenDesc = parseInt(this.producto.maxPorcenDesc.toString());
    this.producto.cantidad = parseFloat(this.producto.cantidad.toString());
    this.producto.cantidadStock = parseFloat(this.producto.cantidadStock.toString());
    this.producto.cantidadPedida = parseFloat(this.producto.cantidadPedida.toString());

    const techo = getTechoEfectivo(this.producto, this.producto.cantidad);

    if ( this.producto.cantidad > (this.producto.cantidadStock - this.producto.cantidadPedida) ) {
      alert('El stock maximo para la venta es: ' + (this.producto.cantidadStock - this.producto.cantidadPedida));
      return;
    }
    else if ( this.producto.porcenDesc > techo ) {
      alert('El porcentaje maximo de descuento que puede utilizar es: ' + techo);
      return;
    }
    this.activeModal.close(this.producto);
  }

  eliminarProductoPedido() {
    this.activeModal.close('Eliminar');
  }

}
```

- [ ] **Step 2: Update the modal template**

In `apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.html`:

Change the quantity input (currently `<input type="text" [(ngModel)]="producto.cantidad" class="form-control">`) to fire the recompute:

```html
                <input type="text" [(ngModel)]="producto.cantidad" (ngModelChange)="onCantidadChange()" class="form-control">
```

Then, immediately after the closing `</div>` of the `.row` that contains the Unidades / % Desc / Eliminar columns (i.e. before the closing `</div>` of `.modal-body`), insert the tramo info block:

```html
    <div class="row" *ngIf="tieneTramos">
        <div class="col">
            <div class="alert alert-info py-2 mb-0" role="alert">
                <div><strong>% Desc máx (aplica): {{ techoEfectivo }}%</strong></div>
                <div>
                    <span *ngFor="let t of tramos; let i = index">
                        <span *ngIf="i > 0"> · </span>
                        <span [class.font-weight-bold]="tramoActivoCant === t.cant">Desde {{ t.cant }} uds: {{ t.max }}%</span>
                    </span>
                </div>
            </div>
        </div>
    </div>
```

- [ ] **Step 3: Build to verify component + template compile**

Run:

```bash
cd apps/legacy-frontend && export NODE_OPTIONS=--openssl-legacy-provider && npx ng build
```

Expected: build succeeds with no template or type errors.

- [ ] **Step 4: Manual verification checklist**

Confirm each by inspection / running the app (`ng serve`, Node 16):
- Product with no active tramos: info block is hidden; entering `% Desc` above `maxPorcenDesc` is rejected on Agregar (unchanged behavior).
- Product with tramos: info line lists active tiers; the tier matching the current quantity is bold; `% Desc máx (aplica)` shows the effective ceiling.
- Raising quantity across a tier boundary raises the ceiling label and does not alter the typed `% Desc`.
- Lowering quantity below a tier boundary lowers the ceiling label and, if the typed `% Desc` now exceeds it, clamps the typed value down.
- Agregar rejects a `% Desc` above the ceiling for the entered quantity with the "El porcentaje maximo de descuento que puede utilizar es: N" alert.
- Modify flow (`/pedidos/modificar/:id`): reopening an existing line shows the tramo block (verifies Task 1 order-line query change).

- [ ] **Step 5: Commit**

```bash
git add apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.ts \
        apps/legacy-frontend/src/app/pages/pedidos/modal-detalle-producto/modal-detalle-producto.component.html
git commit -m "feat(pedidos): show discount tramos and cap discount by quantity in detalle modal"
```

---

## Self-Review

**Spec coverage:**
- Mapper exposes tramos (both flows) → Task 1 Steps 1, 4.
- `RegListProductoPedido` POJO + order-line query carry tramos (modify flow) → Task 1 Steps 2, 3, 4.
- Coproad parity → Task 1 Step 4 (+ verification Step 5).
- Frontend model fields → Task 2 Step 1.
- Effective-ceiling semantics (base + ascending active tramos) → Task 2 Step 4, tested Step 2.
- Info line with active-tier highlight + "aplica" label → Task 3 Step 2.
- Live recompute both directions + auto-clamp on drop only → Task 3 Step 1 (`onCantidadChange`).
- Validate on Agregar against effective ceiling → Task 3 Step 1 (`ingresarDetalleProducto`).
- Backend create validation unchanged → not touched by any task (explicit in Global Constraints).
- Shared modal covers crear + modificar → Task 3 (single component) + Task 3 Step 4 modify check.

**Placeholder scan:** No TBD/TODO; all code and commands are concrete.

**Type consistency:** `getTechoEfectivo`, `getTramosActivos`, `getTramoActivoCant`, `TramoPricing`, `Tramo` defined in Task 2 and consumed with matching signatures in Task 3. Model fields `cantTramoN`/`maxPorcenTramoN` and DTO keys `cantTramoN`/`maxPorcenTramoN` match between Task 1 (JSON) and Task 2 (model). PHP property names `cant_tramoN`/`max_porcen_tramoN` match the schema columns.
