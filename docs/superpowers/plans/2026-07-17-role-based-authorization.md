# Role-Based Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the products module (API + Angular views) to users whose `10_m_usuario.id_tipo_usuario` is allowed, driven by a single shared policy map, extensible to more roles/modules.

**Architecture:** A `MODULE_ROLES` map in `@serfel/shared` is the one source of the policy. The Lambda enforces it authoritatively (read `custom:id_usuario` claim → look up `id_tipo_usuario` in the DB → check the map → 403 `PROHIBIDO`); a new `GET /api/me` returns the user's identity + accessible modules; the Angular app mirrors the policy for UX (session-backed route guard, `/sin-acceso` page, hidden nav). No schema migration, no token change.

**Tech Stack:** TypeScript, Zod, Hono (Lambda), Drizzle + mysql2, Angular 20 (standalone + signals), Vitest, SST v3.

## Global Constraints

- Repo root for all commands and commits: `/Users/christiancastro/Documents/Serfel/AWS/serfel`.
- Prefix every node/pnpm/ng command with `PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH`. AWS commands use `AWS_PROFILE=admin-christian`, region `us-east-1`.
- Local tests need the docker MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait`.
- Roles (`10_p_tipo_usuario`): `0 Sin Info, 1 Administrador, 2 Vendedor, 3 Secretaria`. Products module allows **`[1]`** today.
- Policy lives ONLY in `@serfel/shared`'s `MODULE_ROLES` — the Lambda and the Angular guard/nav both import it; never hardcode role numbers elsewhere.
- Authorization is enforced authoritatively in the API; frontend checks are UX only.
- `GET /api/me` requires only a valid `custom:id_usuario` claim (NOT the products role) so denied users can still learn their access. `/api/products*` and `/api/lookups` require the products role.
- Error codes: `PROHIBIDO` (403) = authenticated but wrong role; `NO_AUTORIZADO` (403) = missing/invalid `custom:id_usuario` mapping (existing). 401 (unauthenticated) is handled by the API Gateway JWT authorizer.
- Never select or log `10_m_usuario.password`.
- Role is read from the DB per request (no caching — keeps role changes immediate).
- TypeScript strict; no `any` unless an unavoidable narrow cast. Conventional commits.
- Do NOT stop the dev RDS DB (`serfel-dev-db`) — the user stops it manually. Start it when a task needs it.
- After a frontend `build`, `apps/frontend/src/environments/environment.gen.ts` gets regenerated — revert it before committing: `git checkout -- apps/frontend/src/environments/environment.gen.ts`.

---

### Task 1: `@serfel/shared` — MODULE_ROLES policy, helpers, MeDto, PROHIBIDO

**Files:**
- Create: `packages/shared/src/authz.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/productos.ts` (add `PROHIBIDO` to `ApiErrorCode`)
- Test: `packages/shared/tests/authz.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MODULE_ROLES = { productos: [1] } as const`
  - `type ModuleName = keyof typeof MODULE_ROLES` (currently `"productos"`)
  - `tipoCanAccess(module: ModuleName, tipo: number): boolean`
  - `modulesForTipo(tipo: number): ModuleName[]`
  - `interface MeDto { idUsuario: number; idTipoUsuario: number; nomUsuario: string; modulos: ModuleName[] }`
  - `ApiErrorCode` now also includes `"PROHIBIDO"`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/tests/authz.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MODULE_ROLES, tipoCanAccess, modulesForTipo } from "../src/authz";

describe("MODULE_ROLES", () => {
  it("grants productos to tipo 1 only", () => {
    expect(MODULE_ROLES.productos).toEqual([1]);
  });
});

describe("tipoCanAccess", () => {
  it("is true for an allowed tipo, false otherwise", () => {
    expect(tipoCanAccess("productos", 1)).toBe(true);
    expect(tipoCanAccess("productos", 2)).toBe(false);
    expect(tipoCanAccess("productos", 0)).toBe(false);
  });
});

describe("modulesForTipo", () => {
  it("lists the modules a tipo can access", () => {
    expect(modulesForTipo(1)).toEqual(["productos"]);
    expect(modulesForTipo(2)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared test`
Expected: FAIL — cannot resolve `../src/authz`.

- [ ] **Step 3: Implement `authz.ts`**

Create `packages/shared/src/authz.ts`:

```ts
/**
 * The single source of which id_tipo_usuario values may access each module.
 * Imported by both the Lambda authorization check and the Angular guard/nav
 * so the API and UI can never disagree. Extend by adding a module key or a
 * tipo to an existing list.
 */
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
} as const;

export type ModuleName = keyof typeof MODULE_ROLES;

export function tipoCanAccess(module: ModuleName, tipo: number): boolean {
  return (MODULE_ROLES[module] as readonly number[]).includes(tipo);
}

export function modulesForTipo(tipo: number): ModuleName[] {
  return (Object.keys(MODULE_ROLES) as ModuleName[]).filter((m) =>
    tipoCanAccess(m, tipo)
  );
}

export interface MeDto {
  idUsuario: number;
  idTipoUsuario: number;
  nomUsuario: string;
  modulos: ModuleName[];
}
```

- [ ] **Step 4: Add `PROHIBIDO` to `ApiErrorCode`**

In `packages/shared/src/productos.ts`, extend the union:

```ts
export type ApiErrorCode =
  | "COD_SERFEL_EN_USO"
  | "NOMBRE_EN_USO"
  | "PRODUCTO_NO_ENCONTRADO"
  | "VALIDACION"
  | "NO_AUTORIZADO"
  | "PROHIBIDO"
  | "DB_NO_DISPONIBLE"
  | "ERROR_INTERNO";
```

- [ ] **Step 5: Export from the barrel**

In `packages/shared/src/index.ts`, add `export * from "./authz";` after the existing exports:

```ts
export * from "./productos";
export * from "./authz";
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @serfel/shared test` — Expected: PASS.
Run: `pnpm typecheck` — Expected: no errors (pre-existing noise only).

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): MODULE_ROLES policy, role helpers, MeDto, PROHIBIDO code"
```

---

### Task 2: Backend service — role loader, /me service, test-DB seed for a second tipo

**Files:**
- Modify: `lambdas/products/service.ts`
- Modify: `lambdas/products/tests/helpers.ts`
- Test: `lambdas/products/tests/service.test.ts` (append)

**Interfaces:**
- Consumes: `Db`, `t10MUsuario`, `t10PTipoUsuario` from `@serfel/db`; `modulesForTipo`, `MeDto`, `AppError` types; existing `SEED` helper.
- Produces:
  - `getUserTipo(db: Db, idUsuario: number): Promise<number | null>` — returns `id_tipo_usuario` or `null` if the user row is absent.
  - `getMe(db: Db, idUsuario: number): Promise<MeDto>` — `{ idUsuario, idTipoUsuario, nomUsuario, modulos }`; throws `AppError("NO_AUTORIZADO", 403, …)` if the user row is absent.
  - Test helper `setupTestDb` now also seeds tipo_usuario rows `1 Administrador` + `2 Vendedor` and a second user `id_usuario 2` with `id_tipo_usuario 2`. `SEED` gains `idUsuarioVendedor: 2`, `tipoAdmin: 1`, `tipoVendedor: 2`.

- [ ] **Step 1: Extend the test-DB seed**

In `lambdas/products/tests/helpers.ts`, add `id_tipo_usuario` fields to `SEED`:

```ts
export const SEED = {
  idUsuario: 1,
  idUsuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  marcaSoprole: 1,
  marcaNestle: 2,
  tipoYogurt: 1,
  umUni: 1,
  umLt: 2,
  impSinAdicional: 0,
  impIva: 3,
} as const;
```

Replace the `t10PTipoUsuario` + `t10MUsuario` seed block with one that seeds both roles and both users (the admin keeps `idUsuario 1`; add a Vendedor `idUsuario 2`):

```ts
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    {
      idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1",
      nomUsuario: "Admin Test", apellPatUsuario: "User", apellMatUsuario: "X",
      password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
    {
      idUsuario: SEED.idUsuarioVendedor, rutUsuario: 22222222, dvUsuario: "2",
      nomUsuario: "Vendedor Test", apellPatUsuario: "User", apellMatUsuario: "Y",
      password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
  ]);
```

(Leave the estados, marcas, tipoProducto, unidadesMedida, and impuesto seeds unchanged. The `t10PTipoUsuario` and `t10MUsuario` imports already exist in this file.)

- [ ] **Step 2: Write the failing tests**

Append to `lambdas/products/tests/service.test.ts` (extend the `"../service"` import with `getUserTipo, getMe`):

```ts
describe("getUserTipo", () => {
  it("returns the id_tipo_usuario for an existing user", async () => {
    expect(await getUserTipo(db, SEED.idUsuario)).toBe(SEED.tipoAdmin);
    expect(await getUserTipo(db, SEED.idUsuarioVendedor)).toBe(SEED.tipoVendedor);
  });
  it("returns null for a missing user", async () => {
    expect(await getUserTipo(db, 999999)).toBeNull();
  });
});

describe("getMe", () => {
  it("returns identity + accessible modules for an admin", async () => {
    const me = await getMe(db, SEED.idUsuario);
    expect(me).toEqual({
      idUsuario: SEED.idUsuario,
      idTipoUsuario: SEED.tipoAdmin,
      nomUsuario: "Admin Test",
      modulos: ["productos"],
    });
  });
  it("returns an empty module list for a vendedor", async () => {
    const me = await getMe(db, SEED.idUsuarioVendedor);
    expect(me.idTipoUsuario).toBe(SEED.tipoVendedor);
    expect(me.modulos).toEqual([]);
  });
  it("throws NO_AUTORIZADO for a missing user", async () => {
    await expect(getMe(db, 999999)).rejects.toMatchObject({
      code: "NO_AUTORIZADO",
      status: 403,
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `getUserTipo` / `getMe` are not exported.

- [ ] **Step 4: Implement the loaders**

In `lambdas/products/service.ts`, add `t10MUsuario` to the `@serfel/db` import and `modulesForTipo` + `MeDto` to the `@serfel/shared` import, then append:

```ts
export async function getUserTipo(
  db: Db,
  idUsuario: number
): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function getMe(db: Db, idUsuario: number): Promise<MeDto> {
  const rows = await db
    .select({
      idTipoUsuario: t10MUsuario.idTipoUsuario,
      nomUsuario: t10MUsuario.nomUsuario,
    })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  if (rows.length === 0) {
    throw new AppError(
      "NO_AUTORIZADO",
      403,
      "El usuario autenticado no existe en el sistema"
    );
  }
  const { idTipoUsuario, nomUsuario } = rows[0];
  return {
    idUsuario,
    idTipoUsuario,
    nomUsuario,
    modulos: modulesForTipo(idTipoUsuario),
  };
}
```

(The import line becomes `import { ..., t10MUsuario, type Db } from "@serfel/db";` and the shared import adds `modulesForTipo, type MeDto`. `eq` and `AppError` are already imported.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS (all suites, including the pre-existing ones — the new second seeded user doesn't affect them).

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/products/service.ts lambdas/products/tests/helpers.ts lambdas/products/tests/service.test.ts
git commit -m "feat(products): getUserTipo + getMe service loaders; seed a second tipo in tests"
```

---

### Task 3: Backend — requireModule middleware, /me route, route gating

**Files:**
- Create: `lambdas/products/types.ts`
- Create: `lambdas/products/authz.ts`
- Modify: `lambdas/products/app.ts`
- Modify: `lambdas/products/index.ts` (import `AppDeps` from the new `types.ts`)
- Test: `lambdas/products/tests/app.test.ts` (append + adjust)

**Interfaces:**
- Consumes: `getUserTipo`, `getMe` (Task 2); `tipoCanAccess`, `ModuleName` (Task 1); `AppError`.
- Produces:
  - `types.ts`: `interface AppDeps { getDb: () => Promise<Db>; getIdUsuario: (c: Context) => number | null }` and `type AppEnv = { Variables: { idUsuario: number; idTipoUsuario: number } }`.
  - `authz.ts`: `requireModule(module: ModuleName, deps: AppDeps): MiddlewareHandler<AppEnv>` — assumes `idUsuario` is already set on context; loads the tipo, sets `idTipoUsuario`, throws `403 PROHIBIDO` if not allowed / `403 NO_AUTORIZADO` if the user row is gone.
  - `app.ts`: `GET /api/me` (only the id_usuario gate); `/api/products*` + `/api/lookups` additionally gated by `requireModule('productos')`.

- [ ] **Step 1: Extract shared app types**

Create `lambdas/products/types.ts`:

```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
```

- [ ] **Step 2: Write the failing tests**

In `lambdas/products/tests/app.test.ts`, the harness sets the current user via a mutable `currentUser`. Add role-based cases. Append these tests (they rely on the Task 2 seed: user 1 = admin, user 2 = vendedor):

```ts
describe("role-based access", () => {
  it("GET /api/me works for any authenticated user (admin)", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuario;
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      idUsuario: SEED.idUsuario,
      idTipoUsuario: SEED.tipoAdmin,
      modulos: ["productos"],
    });
  });

  it("GET /api/me works for a vendedor and reports no modules", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuarioVendedor;
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    expect((await res.json()).modulos).toEqual([]);
    currentUser = SEED.idUsuario;
  });

  it("403 PROHIBIDO when a vendedor hits products or lookups", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuarioVendedor;
    try {
      const prods = await app.request("/api/products");
      expect(prods.status).toBe(403);
      expect((await prods.json()).error.code).toBe("PROHIBIDO");

      const looks = await app.request("/api/lookups");
      expect(looks.status).toBe(403);
      expect((await looks.json()).error.code).toBe("PROHIBIDO");
    } finally {
      currentUser = SEED.idUsuario;
    }
  });

  it("admin still gets 200 on products and lookups", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuario;
    expect((await app.request("/api/products")).status).toBe(200);
    expect((await app.request("/api/lookups")).status).toBe(200);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `/api/me` returns 404 (no route yet) and the vendedor gets 200 (no gate yet).

- [ ] **Step 4: Implement the middleware**

Create `lambdas/products/authz.ts`:

```ts
import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

/**
 * Authorization gate for a module. Assumes an earlier middleware has already
 * set `idUsuario` on the context (authenticated + mapped). Loads the user's
 * id_tipo_usuario from the DB and checks it against MODULE_ROLES.
 */
export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) {
      throw new AppError(
        "NO_AUTORIZADO",
        403,
        "El usuario autenticado no existe en el sistema"
      );
    }
    if (!tipoCanAccess(module, tipo)) {
      throw new AppError(
        "PROHIBIDO",
        403,
        "No tienes acceso a este módulo"
      );
    }
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
```

- [ ] **Step 5: Wire the app**

Edit `lambdas/products/app.ts`:

1. Replace the `AppDeps` interface + `Env` type (lines ~18-24) with imports:

```ts
import { getMe } from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";
```

Remove the local `export interface AppDeps { … }` and `type Env = …`; use `AppEnv` wherever `Env` was used (`new Hono<AppEnv>()`).

2. Keep the existing global id_usuario middleware (`app.use("*", …)` that sets `idUsuario`) unchanged — it gates every route including `/me`.

3. Immediately after that middleware, add the module gate for products routes and the `/me` route (order matters: register the gate before the routes):

```ts
  const productos = requireModule("productos", deps);
  app.use("/lookups", productos);
  app.use("/products", productos);
  app.use("/products/*", productos);

  app.get("/me", async (c) =>
    c.json(await getMe(await deps.getDb(), c.get("idUsuario")))
  );
```

(The existing `/lookups`, `/products`, `/products/:id`, `/products/:id/restore` route handlers stay as-is; they are now preceded by the gate.)

4. Since `AppDeps` moved to `types.ts`, update `lambdas/products/index.ts`: change its import of `AppDeps`/`createApp` so `AppDeps` (if imported there) comes from `./types`. If `index.ts` only imports `createApp`, no change is needed — verify and adjust.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS — all suites (the existing 403-on-missing-claim test still passes; new role tests pass).

- [ ] **Step 7: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/products
git commit -m "feat(products): requireModule authz gate + GET /api/me; gate products/lookups"
```

---

### Task 4: Frontend — SessionService + /me client

**Files:**
- Create: `apps/frontend/src/app/core/session.service.ts`
- Test: `apps/frontend/src/app/core/session-logic.spec.ts`
- Create: `apps/frontend/src/app/core/session-logic.ts`

**Interfaces:**
- Consumes: `MeDto`, `ModuleName`, `tipoCanAccess` from `@serfel/shared`; `environment`; `HttpClient`.
- Produces:
  - `sessionCanAccess(me: MeDto | null, module: ModuleName): boolean` (pure, in `session-logic.ts`).
  - `SessionService` (injectable): signal `me: Signal<MeDto | null>`; `load(): Promise<MeDto | null>` (fetches `GET {apiUrl}/api/me` once, caches; returns null on failure); `canAccess(module): boolean`; `clear(): void`.

- [ ] **Step 1: Write the failing test for the pure helper**

Create `apps/frontend/src/app/core/session-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { MeDto } from "@serfel/shared";
import { sessionCanAccess } from "./session-logic";

const admin: MeDto = { idUsuario: 1, idTipoUsuario: 1, nomUsuario: "A", modulos: ["productos"] };
const vendedor: MeDto = { idUsuario: 2, idTipoUsuario: 2, nomUsuario: "V", modulos: [] };

describe("sessionCanAccess", () => {
  it("false when there is no session", () => {
    expect(sessionCanAccess(null, "productos")).toBe(false);
  });
  it("true for an allowed tipo, false otherwise", () => {
    expect(sessionCanAccess(admin, "productos")).toBe(true);
    expect(sessionCanAccess(vendedor, "productos")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend test`
Expected: FAIL — cannot resolve `./session-logic`.

- [ ] **Step 3: Implement the pure helper**

Create `apps/frontend/src/app/core/session-logic.ts`:

```ts
import { tipoCanAccess, type MeDto, type ModuleName } from "@serfel/shared";

/** UX-only check mirroring the API's authorization. Null session = no access. */
export function sessionCanAccess(
  me: MeDto | null,
  module: ModuleName
): boolean {
  return me !== null && tipoCanAccess(module, me.idTipoUsuario);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend test`
Expected: PASS.

- [ ] **Step 5: Implement SessionService**

Create `apps/frontend/src/app/core/session.service.ts`:

```ts
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
```

- [ ] **Step 6: Build, test, commit**

```bash
pnpm --filter @serfel/frontend test
pnpm --filter @serfel/frontend build
git checkout -- apps/frontend/src/environments/environment.gen.ts
git add apps/frontend/src/app/core/session.service.ts apps/frontend/src/app/core/session-logic.ts apps/frontend/src/app/core/session-logic.spec.ts
git commit -m "feat(frontend): SessionService + /me client with pure access helper"
```

---

### Task 5: Frontend — module guard, /sin-acceso page, login routing, interceptor, nav

**Files:**
- Create: `apps/frontend/src/app/core/module.guard.ts`
- Create: `apps/frontend/src/app/features/sin-acceso/sin-acceso.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`
- Modify: `apps/frontend/src/app/core/auth.interceptor.ts`
- Modify: `apps/frontend/src/app/features/login/login.component.ts`
- Modify: `apps/frontend/src/app/features/productos/productos-page.component.ts` (nav + header name)

**Interfaces:**
- Consumes: `SessionService` (Task 4), `AuthService`, `sessionCanAccess`/`ModuleName`.
- Produces: `moduleGuard(module: ModuleName): CanActivateFn` — requires a token (else `/login`), loads the session, allows if `canAccess` else redirects to `/sin-acceso`. Route `/sin-acceso`.

- [ ] **Step 1: Implement the module guard**

Create `apps/frontend/src/app/core/module.guard.ts`:

```ts
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
```

- [ ] **Step 2: Create the /sin-acceso page**

Create `apps/frontend/src/app/features/sin-acceso/sin-acceso.component.ts`:

```ts
import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { SessionService } from "../../core/session.service";

@Component({
  selector: "app-sin-acceso",
  standalone: true,
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1>Sin acceso</h1>
        <p class="login-sub">No tienes acceso a este módulo. Contacta a un administrador.</p>
        <button class="btn-save btn-block" (click)="logout()">Cerrar sesión</button>
      </div>
    </div>
  `,
})
export class SinAccesoComponent {
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private router = inject(Router);

  async logout(): Promise<void> {
    this.session.clear();
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
```

- [ ] **Step 3: Wire the routes**

Replace `apps/frontend/src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { moduleGuard } from './core/module.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';
import { SinAccesoComponent } from './features/sin-acceso/sin-acceso.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'sin-acceso', component: SinAccesoComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: 'productos', component: ProductosPageComponent, canActivate: [moduleGuard('productos')] },
  { path: '**', redirectTo: 'productos' },
];
```

(The old `authGuard` import is dropped from this file; the file `auth.guard.ts` may remain unused — leave it, or delete if nothing else imports it. Verify with `grep -rn "authGuard" apps/frontend/src` and delete `auth.guard.ts` only if there are no other importers.)

- [ ] **Step 4: Redirect on PROHIBIDO in the interceptor**

In `apps/frontend/src/app/core/auth.interceptor.ts`, extend the `catchError` to also handle 403 `PROHIBIDO`:

```ts
    catchError((err) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          void router.navigate(['/login']);
        } else if (err.status === 403 && err.error?.error?.code === 'PROHIBIDO') {
          void router.navigate(['/sin-acceso']);
        }
      }
      return throwError(() => err);
    })
```

- [ ] **Step 5: Route by access after login**

In `apps/frontend/src/app/features/login/login.component.ts`, inject `SessionService` and replace the two `await this.router.navigate(['/productos']);` calls with a helper that routes by access. Add the import + field:

```ts
import { SessionService } from '../../core/session.service';
// in the class:
  private session = inject(SessionService);

  private async goToLanding(): Promise<void> {
    this.session.clear();
    await this.session.load();
    await this.router.navigate([
      this.session.canAccess('productos') ? '/productos' : '/sin-acceso',
    ]);
  }
```

Replace both `await this.router.navigate(['/productos']);` occurrences (in `onLogin` success and `onNewPassword`) with `await this.goToLanding();`.

- [ ] **Step 6: Hide inaccessible nav + show the user's name**

In `apps/frontend/src/app/features/productos/productos-page.component.ts`, inject `SessionService` and guard the nav item + show the name. Add `private session = inject(SessionService);` to the class (import it), then in the template:

- Wrap the Productos nav item so it only renders when accessible:

```html
        <nav class="header-nav">
          @if (session.canAccess('productos')) {
            <div class="nav-item active">Productos</div>
          }
        </nav>
```

- Replace the hardcoded avatar/initials with the user's name from the session (the header avatar currently shows static text) — set its title to the name:

```html
        <div class="header-avatar" (click)="logout()" [title]="(session.me()?.nomUsuario ?? '') + ' — Cerrar sesión'">⎋</div>
```

(These are the only two template edits; the existing `logout()` should also `session.clear()` — add that call as the first line of the page's `logout()` method.)

- [ ] **Step 7: Build and test**

Run: `pnpm --filter @serfel/frontend test` — Expected: PASS (existing + session-logic specs).
Run: `pnpm --filter @serfel/frontend build` — Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git checkout -- apps/frontend/src/environments/environment.gen.ts
git add apps/frontend/src
git commit -m "feat(frontend): module guard, /sin-acceso page, access-based routing and nav"
```

---

### Task 6: Deploy, verify against live API, smoke, push

**Files:**
- Modify: `scripts/api-smoke.sh` (add a `/me` check)

**Interfaces:**
- Consumes: everything above; the deployed stack.
- Produces: authorization live in dev; `api-smoke.sh` also asserts `GET /me` returns 200 with `productos` in `modulos` for the (tipo-1) smoke user.

- [ ] **Step 1: Add a /me assertion to the smoke**

In `scripts/api-smoke.sh`, after the existing lookups checks (before the create section), add:

```bash
# /me is reachable by any authenticated user; the smoke user is tipo 1 (admin)
check "GET me" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/me")"
ME_MODS=$(curl -s "${AUTH[@]}" "$API_URL/api/me" | json_field "['modulos']")
check "me lists productos" "['productos']" "$ME_MODS"
```

- [ ] **Step 2: Typecheck, run full local suite**

```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm typecheck
pnpm -r test
```

Expected: typecheck clean; all suites pass (shared incl. authz, db, lambdas incl. role tests, frontend incl. session-logic).

- [ ] **Step 3: Deploy**

```bash
AWS_PROFILE=admin-christian npx sst deploy --stage dev
git checkout -- apps/frontend/src/environments/environment.gen.ts
```

Expected: deploy succeeds; Api + Frontend URLs printed.

- [ ] **Step 4: Verify against the live API (DB must be running)**

Start the DB if needed (`AWS_PROFILE=admin-christian pnpm db:start`, wait for `available`; do NOT stop it afterward). Then run the smoke with the tipo-1 user:

```bash
PW=$(grep -A1 'Permanent password' .superpowers/sdd/task-7-report.md | grep -oE '`[A-Za-z0-9]{16,}`' | head -1 | tr -d '`')
AWS_PROFILE=admin-christian SMOKE_EMAIL=fracktured@gmail.com SMOKE_PASSWORD="$PW" ./scripts/api-smoke.sh
```

Expected: `10 passed, 0 failed` (8 prior checks + the 2 new /me checks).

- [ ] **Step 5: Commit and push**

```bash
git add scripts/api-smoke.sh
git commit -m "test(smoke): assert GET /me returns productos for the admin user"
git push origin main
```

Watch the CI run (public API, no gh CLI): `curl -s "https://api.github.com/repos/fracktured/serfel/actions/runs?per_page=1"` — the run must conclude `success` (typecheck + tests + deploy + migrate).

- [ ] **Step 6: Close out**

- Report to the user: authorization is live; the admin (fracktured@gmail.com, tipo 1) keeps full access; a tipo≠1 user now gets 403 from the API and lands on `/sin-acceso` in the UI. Manual browser check suggested (log in as admin → productos loads; there is no tipo≠1 Cognito user seeded to test denial in the browser unless one is created via `scripts/cognito-create-user.sh`).
- Note in `serfel/.git/sdd/progress.md`.

---

## Self-Review Notes

- **Spec coverage:** §4 policy → Task 1. §5 role loader + requireModule + /me + route gating → Tasks 2 & 3. §6 SessionService/guard/sin-acceso/login routing/interceptor/nav → Tasks 4 & 5. §7 testing → shared (T1), getUserTipo/getMe + role app tests (T2/T3), session-logic (T4), smoke /me (T6). §8 out-of-scope respected (no DB perms table, no caching, no /me extraction, all-or-nothing per module). §9 verify → seeded admin is tipo 1 (already confirmed in the spec).
- **Deliberate testing scope:** the Angular guard (`moduleGuard`) is orchestration over `SessionService.canAccess` + `sessionCanAccess` (both unit-tested) and `AuthService.getIdToken`; it is verified via the live smoke/manual browser rather than a new TestBed harness, consistent with the codebase's existing no-TestBed test approach.
- **Type consistency:** `MeDto` fields (`idUsuario`, `idTipoUsuario`, `nomUsuario`, `modulos`) identical across shared, service `getMe`, `/me` route, SessionService, guard. `requireModule(module, deps)`, `getUserTipo(db, idUsuario)`, `sessionCanAccess(me, module)`, `AppDeps`, `AppEnv` used consistently. Error codes `PROHIBIDO`/`NO_AUTORIZADO` consistent between backend throws and frontend interceptor check.
- **No migration:** `id_tipo_usuario` pre-exists; nothing in `packages/db/migrations`.
