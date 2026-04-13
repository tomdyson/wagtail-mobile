# wagtail-mobile

A mobile app for browsing and quick-editing Wagtail CMS content, built with Expo (React Native).

Connects to any Wagtail site running [wagtail-write-api](https://github.com/tomdyson/wagtail-write-api) (>= 0.8.0).

## Features

- **Page tree browser** — navigate the page hierarchy, see live/draft status at a glance
- **Global search** — search all pages across the site
- **Quick editing** — edit titles, slugs, dates, and text fields from your phone
- **Rich text as Markdown** — rich text fields displayed and edited as Markdown
- **Publish / unpublish / delete** — manage page workflow with haptic feedback and confirmation dialogs
- **Image gallery** — browse images with thumbnail grid and search
- **Username/password login** — secure token storage with automatic logout on expired/revoked tokens

## Screenshots

_Coming soon_

## Quick start

### 1. Set up a Wagtail site with wagtail-write-api

```bash
pip install wagtail-write-api
```

Follow the [wagtail-write-api docs](https://tomdyson.github.io/wagtail-write-api/) to add it to your Wagtail project. You need version 0.8.0+ for the login endpoint.

For local development, use the example app:

```bash
cd wagtail-write-api/example
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver 0.0.0.0:8000
```

### 2. Run the mobile app

```bash
cd wagtail-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

For SDK 55+, Expo Go may lag behind the latest SDK release. If Expo Go says the project requires a newer version, use a development build instead:

```bash
npm run start:dev-client
```

### 3. Log in

Enter your Wagtail site's API URL and your username/password:

- **URL**: `http://<your-mac-ip>:8000/api/write/v1` (for local dev)
- **Username/Password**: your Wagtail admin credentials

## Stack

- [Expo](https://expo.dev/) SDK 54 with TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) (credential storage)
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) (tactile feedback)
- Plain `fetch` for HTTP (no axios/httpx)
- React Context for state (no Redux/zustand)

No third-party UI component libraries.

## Project structure

```
wagtail-mobile/
  app/
    _layout.tsx              Root layout (auth gate, Stack navigator)
    login.tsx                Username/password login
    (tabs)/
      _layout.tsx            Tab bar (Pages, Images)
      index.tsx              Pages tab — root page tree
      images.tsx             Images tab — thumbnail grid
    pages/
      [id].tsx               Page detail/edit
      children/[parentId].tsx  Drill into children
      create.tsx             Create new page
    images/
      [id].tsx               Image detail
  lib/
    api.ts                   Typed fetch wrapper for wagtail-write-api
    types.ts                 TypeScript types matching API responses
    auth.ts                  SecureStore helpers
    richtext.ts              Markdown payload helper
    hooks/                   React hooks for data fetching
  components/
    PageRow.tsx              Page list row with status badge
    StatusBadge.tsx          Live/Draft/Draft changes indicator
    ImageCard.tsx            Thumbnail card for grid
    DateField.tsx            Native date/datetime picker
    Skeleton.tsx             Animated skeleton loading placeholders
```

## Development

```bash
npm install              # install dependencies
npx expo start           # start dev server
npm run start:dev-client # start Metro for a development build
npm run typecheck        # type check
npm test                 # run shared form/date unit tests
```

## Development builds

This project is configured for Expo development builds with `expo-dev-client` and EAS Build.

Why this is different from Expo Go:

- Expo Go is a generic app from the App Store that can open compatible Expo projects directly.
- A development build is your own copy of this app, compiled once with the native modules and config this project needs.
- The initial build/install step is slower than Expo Go, but after the development build is installed you still get the normal local development loop with Fast Refresh.

In practice:

- build and install the development client once
- start Metro locally with `npm run start:dev-client`
- save JS/TS/style changes and see them update immediately in the installed app
- rebuild only when native dependencies, config plugins, or other native project settings change

One-time setup:

```bash
npm install
npx eas login
```

Build and install an iOS development client:

```bash
npx eas build --profile development --platform ios
```

Build an iOS simulator client instead:

```bash
npx eas build --profile development-simulator --platform ios
```

After installing the development build on your device or simulator, start Metro with:

```bash
npm run start:dev-client
```

Then open the installed development build and connect to the local Metro server.

### Faster local option

If you want the fastest edit-refresh loop on your Mac, prefer local native runs over cloud EAS builds while developing:

```bash
npx expo run:ios
```

or

```bash
npx expo run:android
```

These commands build the native app locally and then let you keep using Fast Refresh through Metro, without waiting for a new cloud build each time.

## Tests

Current automated tests cover the shared typed form layer and date handling logic.

Run all tests:

```bash
npm test
```

What `npm test` does:

- compiles the TypeScript test files with `tsconfig.test.json`
- writes temporary compiled output to `/tmp/wagtail-mobile-test-dist`
- runs the resulting Node-based tests with the built-in `node:test` runner

Run type checking separately:

```bash
npm run typecheck
```

Current test scope:

- form model generation for create/edit
- typed payload serialization
- required-field validation
- inline panel payload cleanup
- StreamField markdown payload shaping
- date-only round-trip safety

Not yet covered:

- React Native UI rendering/integration tests
- end-to-end Expo/device tests

## API requirements

Requires [wagtail-write-api](https://github.com/tomdyson/wagtail-write-api) >= 0.8.0, which provides:

- `POST /auth/token/` — username/password login
- `GET /pages/{id}/?rich_text_format=markdown` — rich text as Markdown
- Full page CRUD, publish/unpublish, image management

## Related projects

- [wagtail-write-api](https://github.com/tomdyson/wagtail-write-api) — the server-side API plugin
- [wagapi](https://github.com/tomdyson/wagapi) — CLI client for the same API, optimised for LLM orchestration

## License

MIT
