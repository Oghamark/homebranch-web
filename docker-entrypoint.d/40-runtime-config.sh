#!/bin/sh
# Writes /config.js from CLOUD_MODE and PORTAL_URL so the static build needs no rebuild per deployment.
set -eu

target=/usr/share/nginx/html/config.js
escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cloud=false
[ "${CLOUD_MODE:-}" = "true" ] && cloud=true

printf 'window.__HB_CONFIG__ = { cloudMode: %s, portalUrl: "%s" };\n' "$cloud" "$(escape "${PORTAL_URL:-}")" > "$target"
