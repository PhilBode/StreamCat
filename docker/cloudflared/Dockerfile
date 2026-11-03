FROM oven/bun:1.4.4 AS shell

FROM cloudflare/cloudflared:2026.10.3
# The official image has no shell; reuse the small shell from our existing base image.
COPY --from=shell /bin/dash /bin/sh
COPY --chmod=755 docker/cloudflared/start.sh /usr/local/bin/start-cloudflared
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-cloudflared"]
