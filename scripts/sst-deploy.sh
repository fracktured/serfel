#!/usr/bin/env bash
# Wrapper for `sst deploy` that works around SST bundling `nodejs.install`
# packages.
#
# For any Lambda with `nodejs: { install: [...] }` (RutasFn/pdfkit,
# sales & orders/sequelize+mysql2), SST runs `npm install <pkg>
# --platform=<os> --arch=<cpu>` in the function bundle. npm >= 11 rejects
# the deprecated `--platform`/`--arch` flags with EUNKNOWNCONFIG, so the
# deploy fails with "failed to run npm install: exit status 1" (this box
# runs npm 12). The modern equivalents are `--cpu`/`--os`, and npm
# auto-detects the target for pure-JS deps anyway, so we simply strip the
# two dead flags via a temporary npm shim placed first on PATH.
#
# This mirrors the shim the CI deploy workflow already applies. Pass any
# sst flags through, e.g.:  ./scripts/sst-deploy.sh --stage dev
set -euo pipefail

REAL_NPM="$(command -v npm)"
: "${REAL_NPM:?npm not found on PATH}"

SHIM_DIR="$(mktemp -d)"
trap 'rm -rf "$SHIM_DIR"' EXIT

cat > "$SHIM_DIR/npm" <<EOF
#!/usr/bin/env bash
# Drop SST's deprecated --platform/--arch flags (both = and space forms),
# then delegate to the real npm.
args=()
skip_next=0
for a in "\$@"; do
  if [ "\$skip_next" = "1" ]; then skip_next=0; continue; fi
  case "\$a" in
    --platform=*|--arch=*) ;;
    --platform|--arch) skip_next=1 ;;
    *) args+=("\$a") ;;
  esac
done
exec "$REAL_NPM" "\${args[@]}"
EOF
chmod +x "$SHIM_DIR/npm"

PATH="$SHIM_DIR:$PATH" exec npx sst deploy "$@"
