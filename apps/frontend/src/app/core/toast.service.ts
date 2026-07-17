import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<{ msg: string; kind: ToastKind } | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, kind: ToastKind = 'ok'): void {
    this.current.set({ msg, kind });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(null), 3500);
  }
}
