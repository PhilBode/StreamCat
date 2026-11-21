# @streamcat/overlay-engine

React components and styles for the StreamCat overlay editor, renderer and OBS player.

## What lives here

- `OverlayEditor`: scene selection, canvas editing, widget settings, assets, history, guides and snapping.
- `OverlayRenderer`: shared 1920x1080 renderer used by the editor preview and the OBS player.
- `OverlayPlayer`: OBS browser-source shell with hash-token auth, snapshot polling and viewport scaling.
- Overlay CSS, the Tiny5/Jersey 10 font files and a fallback theme for hosts without the StreamCat dashboard theme.

## Host requirements

This is a UI library, not a standalone app. A Next.js host must provide:

1. **Next.js transpilation and React**
   - React 19 peer dependencies.
   - `transpilePackages: ["@streamcat/overlay-engine"]` in `next.config.ts`.
   - Keep `@streamcat/interfaces` available; the package imports shared overlay types.

2. **API transport**
   - An `OverlayRequest` adapter. Copy `apps/web/lib/overlay-request.ts` or reimplement it.
   - A `/api/backend/:path*` rewrite to the StreamCat backend.

3. **Asset media proxy**
   - A route for `/api/backend/overlays/assets/[...path]` that forwards to the backend.
   - Public overlay media URLs use this path. Without it, OBS media returns 404.

4. **CSP**
   - Allow the Twitch chat iframe: `frame-src https://chat.johnnycyan.com`.
   - Allow remote images for Spotify album art.
   - Allow media from the host or backend as needed.

5. **App shells**
   - One editor route and one OBS route.
   - Import `@streamcat/overlay-engine/styles.css` in the root layout.
   - The editor shell can be a thin client component that injects the transport and Next `Link`.

Fonts, fallback theme and all overlay CSS ship with the package. No separate asset copy is needed.

## Widget designs

Widget types come from `WIDGET_SPECS` in `packages/interfaces/src/overlay/widgets/`. That list is the only widget type source used by the editor, the renderer and the backend.

Each widget owns its folder:

```text
widgets/
  clock/
    index.ts
    designs/
      stacked/
        index.ts
        stacked.tsx
        stacked.css
      inline/
        index.ts
        inline.tsx
        inline.css
    logic/
      clock-widget.tsx
      use-clock.ts
      clock-settings.tsx
      clock-glyph.tsx
```

Rules:

- `index.ts` aggregates the widget module and metadata. It contains no JSX and imports no CSS.
- Each design folder exports one `WidgetDesign` and imports its own CSS from the TSX file.
- CSS shared by several designs of the same widget lives in `designs/<widget>-base.css`.
- `logic/` holds behavior, hooks, settings and the layer glyph.
- Widget-specific CSS never lives in `styles/renderer.css` or `styles/editor.css`.

Every design declares `colorControls`. The editor sidebar renders that list directly; it does not keep a hardcoded color list.

Built-in designs:

- Spotify `artwork`
- Twitch chat `windowed`, `none`
- Window `windowed`
- Media `media`
- Background `animated`, `solid`
- Text `headline`, `plain`
- Clock `stacked`, `inline`
- Socials `inline`, `icons`
- Shape `rect`, `line`, `ellipse`
- Countdown `stacked`, `inline`
- Ticker `marquee`
- Progress `bar`

Color templates live in `packages/interfaces/src/overlay/color-templates.ts` as `OVERLAY_COLOR_TEMPLATES`. Scene themes and preset defaults both use them.

`colorControls` declare what the editor may change. Keys are `color`, `backgroundColor`, or CSS custom properties such as `--window-bg`. Defaults come from the design's `color`, `backgroundColor` and `tokens`; user values are stored in `params.color`, `params.backgroundColor` and `params.designColors`.

Design components must use `currentColor` or CSS variables for customizable parts. Color-control defaults must be hex values because the editor uses a native color picker.

Starter scenes are built only from widgets. `overlayPreset()` creates background, title, taskbar, socials and clock as normal layers, so every scene element can be selected, moved, styled and deleted.

## Usage

The components run in the browser. Inject the request function from the host app.

```tsx
"use client"

import Link from "next/link"
import {OverlayEditor, type OverlayRequest} from "@streamcat/overlay-engine"
import {apiRequest} from "./api"

const request: OverlayRequest = (path, options, fallback) => apiRequest(path, options, fallback)

export function Editor() {
  return (
    <OverlayEditor
      basePath="/dashboard/guilds/123/overlay"
      request={request}
      backHref="/dashboard/123"
      loginHref="/api/backend/dashboard/auth/login"
      linkComponent={Link}
    />
  )
}
```

Render the OBS page with the player:

```tsx
import {OverlayPlayer} from "@streamcat/overlay-engine"

export default function OverlayPage() {
  return <OverlayPlayer />
}
```

`OverlayPlayer` reads the token from the URL hash. It fetches `/api/backend/overlays/live` by default. Override `snapshotUrl`, `pollIntervalMs` or the status labels when the host uses different endpoints.

`OverlayRequest` maps to `request<T>(path, options?, fallback?) => Promise<T>`. The host adapter adds its own API prefix and error messages. Keep `request` referentially stable (module-level constant or `useCallback`); the editor uses it in effect dependencies.

`linkComponent` accepts a host link component, for example Next.js `Link`. `previewIntervalMs` defaults to 5000 and is clamped to at least 1000.

## API contract

The editor calls these paths relative to `basePath`:

- `GET /scenes`
- `POST /scenes`
- `POST /scenes/:id/layout`
- `POST /scenes/:id/rotate`
- `POST /scenes/:id/name`
- `GET /preview`
- `GET /assets`
- `POST /assets`
- `DELETE /assets/:id`

`OverlayPlayer` calls its `snapshotUrl`, default `/api/backend/overlays/live`.

Auth failures are detected through a numeric `status` of `401` or `403` on the thrown error.

The public overlay media URLs point to `/api/backend/overlays/assets/...`. The host must proxy that route to the backend or serve the media directly.

## Styles

Import the stylesheet once:

```tsx
import "@streamcat/overlay-engine/styles.css"
```

The package owns `overlay-*`, `obs-*` and `overlay-skeleton*` rules, plus a low-priority fallback theme. A host theme loaded without cascade layers overrides the fallback automatically. The Tiny5 and Jersey 10 font files ship with the package.

## Scripts

```sh
bun run --cwd packages/ui/overlay-engine typecheck
```
