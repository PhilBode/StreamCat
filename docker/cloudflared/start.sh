#!/bin/sh
set -eu

if [ -z "${TUNNEL_TOKEN:-}" ]; then
    printf '%s\n' '[Cloudflared] Disabled: TUNNEL_TOKEN is empty.'
    exit 0
fi

exec /usr/local/bin/cloudflared --no-autoupdate tunnel run
