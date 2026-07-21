import { Component, OnInit } from '@angular/core';
import { LayoutService } from '@app/services/layout.service';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { RutaModel } from '@app/models/ruta.model';
import { RutaService } from '@app/services/ruta.service';
import { PdfService } from '@app/services/pdf.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-listado-carga',
  templateUrl: './listado-carga.component.html',
  styleUrls: ['./listado-carga.component.css']
})
export class ListadoCargaComponent implements OnInit {
  rutas: RutaModel[];
  rutasSelec = [];
  dropdownSettings:IDropdownSettings = {};
  error = false;
  mensajeError = '';

  constructor(
    private layoutService: LayoutService,
    private rutaService: RutaService,
    private pdfService: PdfService
  ) { }

  ngOnInit(): void {
    this.layoutService.setModulo('Listado Carga');

    this.dropdownSettings = {
      singleSelection: false,
      idField: 'idRuta',
      textField: 'nomRuta',
      selectAllText: 'Seleccionar todos',
      unSelectAllText: 'Deseleccionar todos',
      itemsShowLimit: 3,
      allowSearchFilter: true
    };

    this.rutaService.buscarTodas()
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        this.rutas = response;
      });
  }

  imprimir() {
    this.pdfService.listadoCarga( this.rutasSelec )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      ).subscribe(response => {
        var file = new Blob([response], {type: 'application/pdf'});
        var fileURL = URL.createObjectURL(file);
        window.open(fileURL);
      });
  }

  handleError(err) {
    console.error(err.error.message);
    this.error = true;
    this.mensajeError = err.error.message;
  }

}
