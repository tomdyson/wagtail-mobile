# CLAUDE.md

## Project overview

wagtail-mobile is an Expo (React Native) mobile app for browsing and quick-editing Wagtail CMS content. It connects to Wagtail sites running wagtail-write-api (>= 0.8.3).

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
- `app/pages/[id].tsx` — Page detail/edit screen (all field types, StreamField, inline panels)
- `app/pages/children/[parentId].tsx` — Drill into a page's children
- `app/pages/create.tsx` — Create new page (type picker + full field form)
- `app/images/[id].tsx` — Image detail with full-size preview

### Library

- `lib/api.ts` — fetch-based API client. All endpoints are typed functions. Enforces trailing slashes. Error classes map to HTTP status codes. `SchemaDetail` includes `create_schema` with `$defs` and `widget` hints.
- `lib/types.ts` — TypeScript interfaces mirroring wagtail-write-api response shapes (PageListItem, PageDetail, ImageItem, StreamFieldBlock, BlockTypeSchema, BlockSchema)
- `lib/auth.ts` — SecureStore read/write for base URL and token
- `lib/richtext.ts` — `markdownPayload()` helper for sending markdown to the API
- `lib/streamfield.ts` — StreamField utilities: `isBlockEditable()`, `defaultValueForBlock()`, `generateBlockId()`, `findBlockSchema()`, `prepareBlocksForSave()`. Handles richtext, struct, and array (ListBlock) types recursively.
- `lib/authEvent.ts` — Simple event emitter for 401 auth failures (API layer → root layout disconnect)
- `lib/hooks/useAuth.ts` — AuthContext and useAuth hook
- `lib/hooks/usePages.ts` — usePageChildren, usePageDetail, usePageSearch hooks
- `lib/hooks/useImages.ts` — useImageList, useImageDetail hooks

### Components

- `components/PageRow.tsx` — Row in page tree list. Tap title = edit, tap chevron = drill into children.
- `components/StatusBadge.tsx` — Green dot (live), orange dot (draft changes), grey dot (draft)
- `components/ImageCard.tsx` — Thumbnail card for image grid
- `components/DateField.tsx` — Native iOS date/datetime picker for date fields
- `components/Skeleton.tsx` — Animated skeleton loading placeholders (page rows, image grid)
- `components/streamfield/StreamFieldEditor.tsx` — Renders block cards with add/delete/reorder controls. Self-contained — includes its own "add block" chips for editable types.
- `components/streamfield/BlockEditor.tsx` — Dispatches to the right editor per block type. Handles richtext, string, choice, boolean, date, integer, struct, image_chooser, page_chooser, and array (ListBlock). ListBlockEditor supports add/remove/reorder of list items.
- `components/streamfield/ImageChooser.tsx` — Image picker with modal search grid. Used both in StreamField blocks and for top-level image FK fields (e.g. feed_image).
- `components/streamfield/PageChooser.tsx` — Page picker with modal search list.
- `components/streamfield/ReadOnlyBlock.tsx` — Fallback display for non-editable block types.

## Key behaviours

- **Auth**: Login via `POST /auth/token/` with username/password. Token stored in expo-secure-store. "Disconnect" clears local storage only. Expired/revoked tokens (401 from any API call) automatically redirect to login via `authEvent.ts` listener.
- **Auto-refresh**: Page list screens silently re-fetch data on focus (via `useFocusEffect`), so lists stay current after create/edit/delete without manual pull-to-refresh.
- **Rich text**: Page detail requests `?rich_text_format=markdown`. Edits sent back as `{"format": "markdown", "content": "..."}` via `markdownPayload()`.
- **Date fields**: Detected from the page type schema (`format: "date"` or `format: "date-time"`). Rendered as native iOS date pickers.
- **Boolean fields**: Detected from value type. Rendered as Switch toggle components.
- **Image FK fields**: Detected via `"widget": "image_chooser"` in schema properties (from wagtail-write-api 0.8.2+). Rendered with ImageChooser modal.
- **Inline panels**: Detected from `$defs` references in schema (arrays of objects with defined schemas, e.g. authors). Rendered as editable rows with add/remove. `sort_order` is stripped before save (API manages ordering from array position).
- **StreamField editing**: Full editing for text blocks (RichTextBlock, CharBlock, ChoiceBlock), image/page chooser blocks, StructBlocks composed of editable types, and ListBlocks (e.g. related_pages, gallery). Add/delete/reorder on all editable blocks.
- **Page creation**: Fetches schema to determine allowed child types under a parent. Shows type picker if multiple types are valid. Supports all the same field types as the edit screen (simple fields, dates, booleans, image choosers, rich text, inline panels, StreamFields).
- **Permissions**: Publish/unpublish/delete buttons shown based on `meta.user_permissions` from the API response.
- **Unsaved changes**: `usePreventRemove` hook warns before back-navigation when fields are dirty. Discard resets state then navigates.

## API dependency

This app talks to wagtail-write-api >= 0.8.3. Key endpoints:

- `POST /auth/token/` — login
- `GET /pages/?parent=N` — list children
- `GET /pages/{id}/?rich_text_format=markdown` — page detail with markdown
- `PATCH /pages/{id}/` — update fields
- `POST /pages/{id}/publish/` and `/unpublish/`
- `DELETE /pages/{id}/` — delete page
- `POST /pages/` — create page
- `GET /images/` — list/search images
- `GET /images/{id}/` — image detail
- `GET /schema/` and `/schema/{type}/` — page type discovery (includes `widget` hints for FK fields, `$defs` for inline panel schemas, `streamfield_blocks` for block type schemas)

## Dependencies

Beyond the default Expo template:

- `expo-router` — file-based routing
- `expo-secure-store` — credential storage
- `expo-haptics` — tactile feedback on publish/unpublish
- `expo-image-picker` — image upload from camera roll
- `@expo/vector-icons` — tab and UI icons
- `@react-native-community/datetimepicker` — native date pickers
- `@react-navigation/core` — `usePreventRemove` for unsaved changes warning
- `react-native-safe-area-context` — safe area insets
- `react-native-screens` — native navigation screens
- `react-native-gesture-handler` — gesture support for navigation

No HTTP, state management, or UI component libraries.

## Testing

No test suite yet. Manual testing via Expo Go on iPhone against a local wagtail-write-api instance.
