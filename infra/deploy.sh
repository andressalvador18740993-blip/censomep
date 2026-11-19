#!/usr/bin/env bash
# Despliegue manual de referencia. Ajusta rutas/host.
set -euo pipefail

echo "== 1) Build frontend =="
(cd frontend && npm ci && npm run build)

echo "== 2) Desplegar frontend a Cloudflare Pages =="
# Opción A: subir a Cloudflare Pages con wrangler (requiere Wrangler autenticado)
# npx wrangler pages deploy frontend/dist --project-name=militante-mep

echo "== 3) Desplegar worker al VPS =="
# Ajusta HOST y rutas según tu servidor
# rsync -avz worker/ root@TU_VPS:/opt/mep/worker/
# ssh root@TU_VPS "systemctl restart mep-worker"

echo "Listo. Revisa los pasos comentados y ajústalos a tu entorno."
