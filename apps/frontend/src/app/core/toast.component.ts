import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

const COLORS = { ok: '#059669', error: '#dc2626', info: '#2563eb' } as const;

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (toasts.current(); as t) {
      <div class="toast show">
        <div class="toast-icon" [style.background]="color(t.kind)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <span>{{ t.msg }}</span>
      </div>
    }
  `,
})
export class ToastComponent {
  readonly toasts = inject(ToastService);
  color(kind: 'ok' | 'error' | 'info'): string {
    return COLORS[kind];
  }
}
