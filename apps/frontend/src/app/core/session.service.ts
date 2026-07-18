import { inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import type { MeDto, ModuleName } from "@serfel/shared";
import { environment } from "../../environments/environment";
import { sessionCanAccess } from "./session-logic";

@Injectable({ providedIn: "root" })
export class SessionService {
  private http = inject(HttpClient);
  private readonly _me = signal<MeDto | null>(null);
  readonly me = this._me.asReadonly();

  /** Fetches /me once and caches it. Returns null if it can't be loaded. */
  async load(): Promise<MeDto | null> {
    if (this._me()) return this._me();
    try {
      const me = await firstValueFrom(
        this.http.get<MeDto>(`${environment.apiUrl}/api/me`)
      );
      this._me.set(me);
      return me;
    } catch {
      this._me.set(null);
      return null;
    }
  }

  canAccess(module: ModuleName): boolean {
    return sessionCanAccess(this._me(), module);
  }

  clear(): void {
    this._me.set(null);
  }
}
