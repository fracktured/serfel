# Distribuidor #

* Distribuidor contiene fuentes PHP
* SerfelWeb contiene fuentes PHP CodeIgniter
* db contiene scripts creación BD
* .env contiene variables para configuración local

### Crear proyecto ###
docker compose build
docker compose up

### Remover proyecto ###
docker compose down

---

## Deploy manual a AWS (Fase 3.5 rehost)

Imagen combinada que sirve **Distribuidor** (PHP crudo, `mysql_*`) y
**SerfelWeb** (CodeIgniter, `mysqli`) desde un mismo doc root de Apache sobre
**PHP 5.6**, compilada para **ARM64** para coincidir con la task definition de
ECS (`Dockerfile.fargate`).

### Por que se despliega manualmente

Esta imagen **no** se construye ni despliega en el workflow `Deploy dev`
(`.github/workflows/deploy-dev.yml`). Motivos:

- El codigo PHP legado cambia poco (cambios menores o ninguno).
- Construirla compila PHP 5.6 + `mbstring` desde el fuente (~10 min por
  ejecucion), lo que hacia lento el CI y llenaba los logs de salida del
  compilador en cada push.
- `sst deploy` administra los recursos de ECS/ECR, pero la task def apunta a un
  tag de ECR **estatico y mutable (`:v1`)**, no a un hash de contenido. Por eso
  SST nunca reconstruye ni sube la imagen, y ECS no detecta una nueva por si
  solo. Hay que subir la imagen **y** forzar un nuevo deployment.

Nota: como el tag `:v1` es mutable y no cambia, ECS seguira sirviendo la imagen
anterior hasta que se fuerce el nuevo deployment. Saltarse ese paso deja
sirviendo codigo viejo aunque el deploy salga "verde".

### Cuando ejecutarlo

Cada vez que cambies codigo bajo `legacy-php/` (`Distribuidor/`, `SerfelWeb/`,
`health.php` o `Dockerfile.fargate`).

### Requisitos

- Docker con `buildx` y QEMU (para cross-build arm64 en un host amd64).
- AWS CLI autenticado con acceso a la cuenta `146476548567` (`us-east-1`).

### Pasos

Ejecutar desde el directorio `legacy-php/`.

```bash
# 1. Habilitar emulacion arm64 (una vez por maquina/sesion; no-op si ya existe).
docker run --privileged --rm tonistiigi/binfmt --install arm64

# 2. Login a ECR.
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    146476548567.dkr.ecr.us-east-1.amazonaws.com

# 3. Construir la imagen arm64 y subirla al tag mutable :v1.
docker buildx build --platform linux/arm64 \
  -f Dockerfile.fargate \
  -t 146476548567.dkr.ecr.us-east-1.amazonaws.com/serfel-dev-rehost-php-app-1:v1 \
  --push .

# 4. Forzar a ECS a bajar el nuevo digest de :v1 (el tag no cambia, asi que ECS
#    no redespliega solo) y esperar a que el servicio se estabilice.
aws ecs update-service --cluster serfel-dev-rehost \
  --service serfel-dev-rehost-php-app-1 --force-new-deployment \
  --region us-east-1

aws ecs wait services-stable --cluster serfel-dev-rehost \
  --services serfel-dev-rehost-php-app-1 --region us-east-1
```

### Verificar

El contenedor tiene un health check contra `/health.php`. Cuando el servicio
este estable, confirma que la task corriendo esta `HEALTHY` y, si cambiaste
codigo, que el contenido nuevo se este sirviendo.