#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
host="${DEPLOY_HOST:-vmerukormi}"
directory="${DEPLOY_DIR:-/var/www/vmerukormi}"
[[ "$host" =~ ^[a-zA-Z0-9_@.-]+$ && "$host" != -* ]] || { echo "Недопустимый SSH-адрес" >&2; exit 1; }
[[ "$directory" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo "Недопустимый путь проекта" >&2; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { echo "Деплой разрешён только из main" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Сначала проверьте и закоммитьте изменения. Автокоммит не выполняется." >&2; exit 1; }
revision="$(git rev-parse HEAD)"
git cat-file -e "$revision:deploy/remote-deploy.sh"
git fetch origin main
git merge-base --is-ancestor origin/main "$revision" || { echo "Локальная ветка отстаёт или расходится с origin/main" >&2; exit 1; }
git push origin "$revision:refs/heads/main"
echo "Публикуем коммит $revision на $host"
git show "$revision:deploy/remote-deploy.sh" | ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$host" "bash -s -- '$directory' '$revision'"
