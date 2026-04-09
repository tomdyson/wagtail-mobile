# wagtail-mobile

A mobile app for browsing and quick-editing Wagtail CMS content, built with Expo (React Native).

Connects to any Wagtail site running [wagtail-write-api](https://github.com/tomdyson/wagtail-write-api) (>= 0.8.0).

## Features

- **Page tree browser** — navigate the page hierarchy, see live/draft status at a glance
- **Quick editing** — edit titles, slugs, dates, and text fields from your phone
- **Rich text as Markdown** — rich text fields displayed and edited as Markdown
- **Publish / unpublish** — manage page workflow with haptic feedback
- **Image gallery** — browse images with thumbnail grid and search
- **Username/password login** — no manual token management

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
```

## Development

```bash
npm install              # install dependencies
npx expo start           # start dev server
npx tsc --noEmit         # type check
```

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
