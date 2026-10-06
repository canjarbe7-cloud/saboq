#!/usr/bin/env bash
# Bazadan zaxira nusxa oladi (VPS, Docker). Ishlatish:  ./scripts/backup.sh
# Har kuni avtomatik ishlashi uchun README'dagi "Bazani zaxiralash" bo'limiga qarang.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
file="backups/admire-$(date +%F-%H%M).sql.gz"

docker compose exec -T db pg_dump -U admire admire | gzip > "$file"
echo "Zaxira saqlandi: $file ($(du -h "$file" | cut -f1))"

# 14 kundan eski zaxiralar o'chiriladi
find backups -name 'admire-*.sql.gz' -mtime +14 -delete
