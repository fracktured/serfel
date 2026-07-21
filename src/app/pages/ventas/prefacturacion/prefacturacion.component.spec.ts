import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrefacturacionComponent } from './prefacturacion.component';

describe('PrefacturacionComponent', () => {
  let component: PrefacturacionComponent;
  let fixture: ComponentFixture<PrefacturacionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PrefacturacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrefacturacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
