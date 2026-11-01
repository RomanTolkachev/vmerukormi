#!/usr/bin/env bash
set -euo pipefail

directory="${1:?Не указан каталог проекта}"
revision="${2:?Не указан коммит}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo "Недопустимый коммит" >&2; exit 1; }
cd "$directory"
exec 9>"$(git rev-parse --git-path deploy.lock)"
flock -n 9 || { echo "На сервере уже идёт деплой" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "На сервере есть незакоммиченные изменения" >&2; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { echo "Сервер должен находиться на main" >&2; exit 1; }
git fetch origin main </dev/null
[[ "$(git rev-parse origin/main)" == "$revision" ]] || { echo "origin/main изменился: повторите деплой актуального коммита" >&2; exit 1; }
git merge --ff-only "$revision" </dev/null
[[ "$(git rev-parse HEAD)" == "$revision" ]] || { echo "Сервер содержит другой коммит" >&2; exit 1; }

compose=(docker compose -f compose.prod.yml)
trap 'echo "Деплой прерван. Следующие шаги не выполнялись; данные и тома не удалены." >&2' ERR
df -h .
COMPOSE_PARALLEL_LIMIT=1 "${compose[@]}" build migrate app </dev/null
"${compose[@]}" up -d --wait postgres </dev/null
"${compose[@]}" up --no-deps --no-build --force-recreate --exit-code-from migrate migrate </dev/null
"${compose[@]}" up -d --no-deps --no-build --wait --wait-timeout 180 app </dev/null
"${compose[@]}" up -d --no-deps nginx </dev/null
"${compose[@]}" exec -T nginx nginx -t </dev/null
"${compose[@]}" exec -T nginx nginx -s reload </dev/null
"${compose[@]}" exec -T nginx wget -q -O /dev/null http://127.0.0.1/login </dev/null
"${compose[@]}" ps </dev/null
echo "Деплой завершён: $revision"
