# CLAUDE.md

## Project overview

wagtail-mobile is an Expo (React Native) mobile app for browsing and quick-editing Wagtail CMS content. It connects to Wagtail sites running wagtail-write-api (>= 0.8.0).

The app is a dashboard, not a full CMS editor. It's designed for checking page status, making quick field edits, and publishing/unpublishing from a phone.

## Key commands

```bash
npm install              # install dependencies
npx expo start           # start Expo dev server
npx tsc --noEmit         # TypeScript check
```

## Architecture

### Routing (Expo Router, file-based)

- `app/_layout.tsx` — Root layout: auth gate, wraps everything in AuthContext + Stack navigator
- `app/login.tsx` — Login screen (username/password via POST /auth/token/)
- `app/(tabs)/_layout.tsx` — Tab bar with Pages and Images tabs
- `app/(tabs)/index.tsx` — Pages tab, shows children of root page (ID 1)
- `app/(tabs)/images.tsx` — Images tab, thumbnail grid with search
- `app/pages/[id].tsx` — Page detail/edit screen
- `app/pages/children/[parentId].tsx` — Drill into a page's children
- `app/pages/create.tsx` — Create new page (type picker + field form)
- `app/images/[id].tsx` — Image detail with full-size preview

### Library

- `lib/api.ts` — fetch-based API client. All endpoints are typed functions. Enforces trailing slashes. Error classes map to HTTP status codes.
- `lib/types.ts` — TypeScript interfaces mirroring wagtail-write-api response shapes (PageListItem, PageDetail, ImageItem, PaginatedList)
- `lib/auth.ts` — SecureStore read/write for base URL and token
- `lib/richtext.ts` — `markdownPayload()` helper for sending markdown to the API
- `lib/hooks/useAuth.ts` — AuthContext and useAuth hook
- `lib/hooks/usePages.ts` — usePageChildren, usePageDetail, usePageSearch hooks
- `lib/hooks/useImages.ts` — useImageList, useImageDetail hooks

### Components

- `components/PageRow.tsx` — Row in page tree list. Tap title = edit, tap chevron = drill into children.
- `components/StatusBadge.tsx` — Green dot (live), orange dot (draft changes), grey dot (draft)
- `components/ImageCard.tsx` — Thumbnail card for image grid
- `components/DateField.tsx` — Native iOS date/datetime picker for date fields

## Key behaviours

- **Auth**: Login via `POST /auth/token/` with username/password. Token stored in expo-secure-store. "Disconnect" clears local storage only.
- **Rich text**: Page detail requests `?rich_text_format=markdown`. Edits sent back as `{"format": "markdown", "content": "..."}`.
- **Date fields**: Detected from the page type schema (`format: "date"` or `format: "date-time"`). Rendered as native iOS date pickers.
- **Page creation**: Fetches schema to determine allowed child types under a parent. Shows type picker if multiple types are valid. Simple fields rendered from create_schema; StreamField/RichText/array fields skipped.
- **Permissions**: Publish/unpublish buttons shown based on `meta.user_permissions` from the API response.

## API dependency

This app talks to wagtail-write-api >= 0.8.0. Key endpoints:

- `POST /auth/token/` — login
- `GET /pages/?parent=N` — list children
- `GET /pages/{id}/?rich_text_format=markdown` — page detail with markdown
- `PATCH /pages/{id}/` — update fields
- `POST /pages/{id}/publish/` and `/unpublish/`
- `POST /pages/` — create page
- `GET /images/` — list images
- `GET /schema/` and `/schema/{type}/` — page type discovery

## Dependencies

Beyond the default Expo template:

- `expo-router` — file-based routing
- `expo-secure-store` — credential storage
- `expo-haptics` — tactile feedback on publish/unpublish
- `@expo/vector-icons` — tab and UI icons
- `@react-native-community/datetimepicker` — native date pickers
- `react-native-safe-area-context` — safe area insets
- `react-native-screens` — native navigation screens
- `react-native-gesture-handler` — gesture support for navigation

No HTTP, state management, or UI component libraries.

## Testing

No test suite yet. Manual testing via Expo Go on iPhone against a local wagtail-write-api instance.
