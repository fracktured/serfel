import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import type { ModuleName } from "@serfel/shared";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";

/** Route guard: authenticated AND authorized for `module`, else redirect. */
export function moduleGuard(module: ModuleName): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const session = inject(SessionService);
    const router = inject(Router);

    const token = await auth.getIdToken();
    if (!token) return router.createUrlTree(["/login"]);

    await session.load();
    return session.canAccess(module)
      ? true
      : router.createUrlTree(["/sin-acceso"]);
  };
}
