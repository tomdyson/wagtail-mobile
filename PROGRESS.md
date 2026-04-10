# Progress

## Done

### Auth
- [x] Username/password login via `POST /auth/token/`
- [x] Token stored in SecureStore
- [x] Auth gate in root layout (redirects to login if not configured)
- [x] Disconnect (clears local credentials)
- [x] Settings tab (connected site URL, app version, disconnect)

### Page tree browser
- [x] Root page children list (parent=1)
- [x] Recursive drill-down into any page's children
- [x] Page title, type label, live/draft status badge on each row
- [x] Tap title to edit, tap chevron to drill into children
- [x] Pull-to-refresh
- [x] Empty state when no children
- [x] Global page search (search bar on Pages tab)
- [x] Auto-refresh lists after create/edit/delete (silent background re-fetch on focus)
- [x] Infinite scroll pagination (20 per page)
- [x] Breadcrumb trail on children screens (derived from URL path)

### Page detail/edit
- [x] View all page fields with editable title and slug
- [x] Shared schema-driven typed form layer for create/edit (field discovery, dirty tracking, validation, payload serialization)
- [x] Rich text fields displayed and edited as Markdown (via API `?rich_text_format=markdown`)
- [x] Date/datetime fields with native picker and date-only round-trip safety (no UTC day drift)
- [x] Simple fields editable with typed handling (text, numbers, booleans, dates, choosers)
- [x] StreamField inline editing for text-based blocks (RichTextBlock as markdown, CharBlock, ChoiceBlock, StructBlocks composed of these). Snippet choosers shown read-only.
- [x] StreamField ListBlock editing (e.g. related_pages, gallery) with add/remove for lists of choosers and structs
- [x] StreamField image chooser with modal search grid and thumbnail preview
- [x] StreamField page chooser with modal search list and title preview
- [x] StreamField block add/delete/reorder (add from editable types, delete with confirmation, up/down reorder)
- [x] Image FK fields with image chooser modal (e.g. feed_image), detected via schema widget hints
- [x] Inline panel editing for orderable children (e.g. authors) with add/remove/edit rows
- [x] Save button in header (appears when fields are dirty)
- [x] Publish / unpublish actions with haptic feedback
- [x] Permission-aware (buttons based on `meta.user_permissions`)
- [x] Boolean fields as toggle switches (shared renderer path for create/edit)
- [x] Unsaved changes warning (usePreventRemove with discard/keep editing dialog)
- [x] Keyboard-avoiding scroll view
- [x] Delete page with confirmation dialog (permission-aware)
- [x] Live status badge links to published page (in-app browser via expo-web-browser)

### Page creation
- [x] "+" button in page tree and children screens
- [x] Type picker filtered by parent's `allowed_subpage_types`
- [x] Auto-skip picker when only one type is valid
- [x] Title, slug, and simple fields from shared typed schema model
- [x] Date fields with native picker and canonical `YYYY-MM-DD` handling
- [x] "Publish immediately" toggle
- [x] StreamField support with add/delete/reorder for all editable block types (including ListBlocks)
- [x] Image FK fields with image chooser modal (e.g. feed_image)
- [x] Rich text fields with markdown editing
- [x] Inline panel fields with add/remove/edit (e.g. authors)

### Image gallery
- [x] Thumbnail grid (3 columns, padded to match page list)
- [x] Search bar
- [x] Pull-to-refresh
- [x] Image detail with full-size preview
- [x] Share button (native share sheet)
- [x] Empty state
- [x] Image upload from camera roll (expo-image-picker)
- [x] Edit image title with save button
- [x] Delete image with confirmation dialog
- [x] Relative media URL resolution (for local dev servers)

### QR code login
- [x] Wagtail admin view ("Mobile app" menu item) showing QR code with API URL + token
- [x] QR scanner on login screen via expo-camera (with camera permission flow)
- [x] Scan QR → instant connection (bypasses username/password)

### Infrastructure
- [x] Expo Router file-based routing with Stack + Tabs
- [x] TypeScript (compiles clean)
- [x] Typed API client (plain fetch, no dependencies)
- [x] Shared form model/types under `lib/forms/` with shared field renderers under `components/forms/`
- [x] Safe area / status bar handling
- [x] iOS-native navigation (back buttons, headers)
- [x] Expired/revoked token handling (401 → auto-redirect to login)
- [x] Skeleton loading screens (page lists, image grid, page detail)
- [x] Pure TypeScript tests for shared form modeling, serialization, validation, and date handling

## Next

### Medium priority
- [x] QR code login — scan QR from Wagtail admin "Mobile app" page to connect instantly (wagtail-write-api 0.8.4 admin view + expo-camera scanner)
- [ ] Page copy and move (API endpoints already exist)
- [ ] Snippet FK chooser fields (schema has `widget: "snippet_chooser"` — needs snippet list API endpoint)
- [ ] Snippets CRUD (API exists at `/snippets/`, needs mobile screens)

### Polish
- [ ] App icon and splash screen (currently Expo defaults — essential for TestFlight/App Store)
- [ ] EAS Build for TestFlight distribution
- [ ] Save confirmation feedback (brief "Saved" toast or banner — currently only haptic)
- [ ] Dark mode support (respect system setting, update all hardcoded colors)
- [ ] Multi-site support (connect to multiple Wagtail instances, switcher in settings)
- [ ] Relative timestamps in page info ("2 hours ago" instead of raw dates)
- [x] Page URL sharing (tap live badge to open published page in-app)

### Stretch
- [ ] Revision history viewer (needs API endpoint)
- [ ] Offline indicator / network error recovery
- [ ] Push notifications for publish/workflow events
- [ ] iPad layout (multi-column)
- [ ] Biometric unlock (FaceID/TouchID gate before showing content)
- [ ] UI/integration tests for React Native screens and form renderers
