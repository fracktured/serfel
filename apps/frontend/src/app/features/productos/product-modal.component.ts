import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ProductoInputSchema,
  type LookupsDto,
  type ProductoDto,
  type ProductoInput,
} from '@serfel/shared';

interface FieldErrors {
  codigo?: string;
  nombre?: string;
}

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ product ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field full">
            <label for="m-name">Nombre del Producto *</label>
            <input id="m-name" type="text" placeholder="YOG.BATIDO SOPR 165grs"
                   [(ngModel)]="nombre" />
            @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="m-code">Nº (código Serfel) *</label>
            <input id="m-code" type="number" placeholder="311" [(ngModel)]="codigo" />
            @if (errors().codigo; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="m-brand">Marca *</label>
            <select id="m-brand" [(ngModel)]="idMarca">
              @for (m of lookups.marcas; track m.id) {
                <option [ngValue]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-um">Unidad de Medida *</label>
            <select id="m-um" [(ngModel)]="idUm">
              @for (u of lookups.unidadesMedida; track u.id) {
                <option [ngValue]="u.id">{{ u.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-tipo">Tipo *</label>
            <select id="m-tipo" [(ngModel)]="idTipoProducto">
              @for (t of lookups.tiposProducto; track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-impuesto">Impuesto *</label>
            <select id="m-impuesto" [(ngModel)]="impuesto">
              @for (i of lookups.impuestos; track i.id) {
                <option [ngValue]="i.id">{{ i.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-porcionado">Es porcionado</label>
            <label class="checkbox-row">
              <input id="m-porcionado" type="checkbox" [(ngModel)]="esPorcionado" />
              <span>{{ esPorcionado ? 'Sí' : 'No' }}</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Producto' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProductModalComponent implements OnInit {
  @Input() product: ProductoDto | null = null;
  @Input({ required: true }) lookups!: LookupsDto;
  @Output() save = new EventEmitter<ProductoInput>();
  @Output() cancel = new EventEmitter<void>();

  nombre = '';
  codigo: number | null = null;
  idMarca: number | null = null;
  idUm: number | null = null;
  idTipoProducto: number | null = null;
  impuesto: number | null = null;
  esPorcionado = false;

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.product) {
      this.nombre = this.product.nomProducto;
      this.codigo = this.product.codSerfel;
      this.idMarca = this.product.idMarca;
      this.idUm = this.product.idUm;
      this.idTipoProducto = this.product.idTipoProducto;
      this.impuesto = this.product.impuesto;
      this.esPorcionado = this.product.usaPorciones === 1;
    } else {
      this.idMarca = this.lookups.marcas[0]?.id ?? null;
      this.idUm = this.lookups.unidadesMedida[0]?.id ?? null;
      this.idTipoProducto = this.lookups.tiposProducto[0]?.id ?? null;
      // default to "Sin Imp. Adicional" (id 0) when present, else first option
      this.impuesto =
        this.lookups.impuestos.find((i) => i.id === 0)?.id ??
        this.lookups.impuestos[0]?.id ??
        null;
      this.esPorcionado = false;
    }
  }

  onSave(): void {
    const parsed = ProductoInputSchema.safeParse({
      codSerfel: this.codigo,
      nomProducto: this.nombre,
      idMarca: this.idMarca,
      idUm: this.idUm,
      idTipoProducto: this.idTipoProducto,
      impuesto: this.impuesto,
      usaPorciones: this.esPorcionado ? 1 : 0,
    });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'codSerfel') errs.codigo = 'Ingresa un número válido (> 0)';
        if (issue.path[0] === 'nomProducto') errs.nombre = 'El nombre es obligatorio (máx. 200)';
      }
      this.errors.set(errs);
      return;
    }
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  /** Called by the parent when the API returns a 409. */
  setServerError(code: 'COD_SERFEL_EN_USO' | 'NOMBRE_EN_USO', message: string): void {
    this.busy.set(false);
    this.errors.set(
      code === 'COD_SERFEL_EN_USO' ? { codigo: message } : { nombre: message }
    );
  }
}
