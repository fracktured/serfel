import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PorcionesComponent } from './porciones.component';

describe('PorcionesComponent', () => {
  let component: PorcionesComponent;
  let fixture: ComponentFixture<PorcionesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PorcionesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PorcionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
