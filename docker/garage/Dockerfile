FROM dxflrs/garage:v2.5.0 AS garage

FROM oven/bun:1.4.4
COPY --from=garage /garage /garage
COPY docker/garage/garage.toml /etc/garage.toml
COPY docker/secrets/load-env.ts /usr/local/bin/load-secrets.ts
ENV SECRETS_FILE=/run/streamcat-secrets/environment.json
ENTRYPOINT ["bun", "/usr/local/bin/load-secrets.ts"]
CMD ["/garage", "server", "--single-node", "--default-bucket"]
