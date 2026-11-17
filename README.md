# StreamCat

A Discord bot for Twitch live alerts and Spotify song requests, with a web dashboard
and an OBS overlay editor. Build scenes with draggable widgets, chat, images and videos.

## License

[MIT](LICENSE)


## Run locally (Bun / VS Code)

You need Bun and Docker.

1. Copy `.env.example` to `.env` and fill in the provider credentials.
2. Set `PUBLIC_URL` to your public HTTPS domain. In Cloudflare, point that hostname
   at `http://host.docker.internal:3000` — the web app runs on your computer.
3. Register the matching callback in each provider app:
   ```text
   https://your-domain/callback/discord
   https://your-domain/callback/twitch
   https://your-domain/callback/spotify
   ```
4. Start the app:
   ```sh
   bun install
   bun run dev
   ```

For the bundled tunnel, set `TUNNEL_TOKEN` and run `bun run dev:tunnel` in another terminal.
VS Code's `StreamCat Full App` starts the backend and web app; start the tunnel separately.

Open your `PUBLIC_URL`. The dev script prepares PostgreSQL, Garage and migrations;
installation secrets are synced from their persistent Docker volume into `.env`.
Connect Twitch and Spotify through the dashboard or Discord.

## Docker / Arcane

Use the same environment settings and callback URLs, then deploy `compose.yml`
in Arcane (a self-hosted Docker deployment UI) or run `docker compose up -d --build`.

Set `TUNNEL_TOKEN` to start the bundled tunnel automatically. In Cloudflare, point the
hostname at `http://web:3000` — the web app now runs in the same Docker network.
Without a token, the tunnel container exits successfully and stays stopped.
`COMPOSE_PROFILES` is no longer needed.

Images and videos live in a private Garage bucket. Docker generates installation secrets on first
start and keeps them across container updates. Back up the secrets volume together with PostgreSQL
and Garage's data and metadata.
