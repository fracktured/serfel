import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ListadoCargaComponent } from './listado-carga.component';

describe('ListadoCargaComponent', () => {
  let component: ListadoCargaComponent;
  let fixture: ComponentFixture<ListadoCargaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ListadoCargaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListadoCargaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
