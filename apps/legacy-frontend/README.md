# SerfelWeb

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.1.8.

## Development server
export NODE_OPTIONS=--openssl-legacy-provider
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.
ng build --prod --aot --outputHashing=all

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

---

## Deploy manual a AWS (Fase 3.5 rehost)

La app Angular 14 legada (variantes **serfel** y **coproad**) se despliega de
forma **manual**, igual que la imagen PHP legada (`legacy-php/README.md`): SST
administra la infraestructura (dos buckets S3 vacios + el CloudFront del
`RehostRouter`), y subir contenido nuevo es un paso manual bajo demanda.

### Por que se despliega manualmente

- El codigo del frontend legado cambia poco.
- Se compila con Node 16 (toolchain distinto al monorepo Node 22), lo que hacia
  lento el CI en cada push.
- `sst deploy` administra los buckets y el Router, pero **nunca** sube contenido
  Angular: un `sst.aws.Bucket` no sube archivos. El contenido lo sube este
  proceso manual.

### Cuando ejecutarlo

Cada vez que cambies codigo bajo `apps/legacy-frontend/` y quieras publicarlo.

### Opcion A: GitHub Action (recomendado)

Actions -> **"Deploy legacy frontend (manual)"** -> **Run workflow**. El job
`build` compila con Node 16 (serfel + coproad) y el job `deploy` sincroniza los
buckets e invalida CloudFront. Desmarca `deploy` para solo compilar.

### Opcion B: Local

Requiere Node 16 y AWS CLI autenticado a la cuenta `146476548567` (`us-east-1`).
Ejecutar desde `apps/legacy-frontend/`.

```bash
# 1. Compilar ambas configuraciones (Node 16).
find . -name "sst-env.d.ts" -not -path "./node_modules/*" -delete || true
npm install
npx ng build --configuration production   # -> dist/serfel-ang
npx ng build --configuration coproad      # -> dist/coproad-ang/coproad (base-href /coproad/)

# 2. Descubrir los buckets (nombre generado por SST) y la distribucion.
SERFEL_BUCKET=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'serfel-dev-rehostlegacyfrontendbucket-')].Name | [0]" --output text)
COPROAD_BUCKET=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'serfel-dev-rehostcoproadfrontendbucket-')].Name | [0]" --output text)
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='serfel-dev-rehost-router'].Id | [0]" --output text)

# 3. Subir (--delete elimina archivos viejos con hash antiguo).
aws s3 sync dist/serfel-ang  "s3://$SERFEL_BUCKET"  --delete
aws s3 sync dist/coproad-ang "s3://$COPROAD_BUCKET" --delete

# 4. Invalidar CloudFront.
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

### Verificar

Tras invalidar, abre la URL del `RehostRouter`: la app serfel carga en `/` y la
coproad en `/coproad/`. Refrescar una ruta profunda (p. ej. `/rutas/1` o
`/coproad/rutas/1`) debe seguir cargando la app (fallback SPA por funcion
viewer-request). El PHP legado (`/Distribuidor`, `/SerfelWeb`) no se ve afectado.

### Limpieza unica de recursos huerfanos (solo la primera vez)

Al migrar de `StaticSite` a `Bucket`, los buckets S3 anteriores y sus
distribuciones CloudFront internas quedan **retenidos** (politica `retain` de
`dev`), no borrados. Una sola vez, tras confirmar que los buckets nuevos sirven
bien: deshabilita y borra esas 2 distribuciones CloudFront huerfanas y vacia +
borra los 2 buckets huerfanos.
