#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
compose=(docker compose --env-file "${ENV_FILE:-.env.production}" -f compose.prod.yml)
"${compose[@]}" run --rm --no-deps certbot renew --cert-name vetenergy --non-interactive --no-random-sleep-on-renew "$@" </dev/null
"${compose[@]}" exec -T nginx nginx -t </dev/null
"${compose[@]}" exec -T nginx nginx -s reload </dev/null
