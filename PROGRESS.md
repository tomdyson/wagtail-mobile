# Progress

## Done

### Auth
- [x] Username/password login via `POST /auth/token/`
- [x] Token stored in SecureStore
- [x] Auth gate in root layout (redirects to login if not configured)
- [x] Disconnect (clears local credentials)
- [x] Settings gear icon in Pages tab header

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
- [x] Rich text fields displayed and edited as Markdown (via API `?rich_text_format=markdown`)
- [x] Date/datetime fields with native iOS picker (detected from schema)
- [x] Simple text/number fields editable
- [x] StreamField inline editing for text-based blocks (RichTextBlock as markdown, CharBlock, ChoiceBlock, StructBlocks composed of these). ListBlocks and snippet choosers shown read-only.
- [x] StreamField image chooser with modal search grid and thumbnail preview
- [x] StreamField page chooser with modal search list and title preview
- [x] StreamField block add/delete/reorder (add from editable types, delete with confirmation, up/down reorder)
- [x] Image FK fields with image chooser modal (e.g. feed_image), detected via schema widget hints
- [x] Inline panel editing for orderable children (e.g. authors) with add/remove/edit rows
- [x] Save button in header (appears when fields are dirty)
- [x] Publish / unpublish actions with haptic feedback
- [x] Permission-aware (buttons based on `meta.user_permissions`)
- [x] Keyboard-avoiding scroll view
- [x] Delete page with confirmation dialog (permission-aware)

### Page creation
- [x] "+" button in page tree and children screens
- [x] Type picker filtered by parent's `allowed_subpage_types`
- [x] Auto-skip picker when only one type is valid
- [x] Title, slug, and simple fields from schema
- [x] Date fields with native picker
- [x] "Publish immediately" toggle
- [x] StreamField support with "add block" buttons for editable block types
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

### Infrastructure
- [x] Expo Router file-based routing with Stack + Tabs
- [x] TypeScript (compiles clean)
- [x] Typed API client (plain fetch, no dependencies)
- [x] Safe area / status bar handling
- [x] iOS-native navigation (back buttons, headers)
- [x] Expired/revoked token handling (401 → auto-redirect to login)
- [x] Skeleton loading screens (page lists, image grid, page detail)

## Next

### Medium priority
- [ ] Unsaved changes warning (prevent accidental back-navigation data loss)
- [ ] Boolean fields as toggle switches (currently render as text inputs)
- [ ] Snippet FK chooser fields (schema has `widget: "snippet_chooser"` — needs snippet list API endpoint)
- [ ] Page copy and move
- [ ] Revision history viewer
- [ ] Snippets CRUD
- [ ] Dark mode support (currently light only)

### Low priority / nice to have
- [ ] Offline indicator / network error recovery
- [ ] App icon and splash screen (currently Expo defaults)
- [ ] Push notifications for publish/workflow events
- [ ] iPad layout (multi-column)
- [ ] QR code login (scan from Wagtail admin)
- [ ] Automated tests (unit + integration)
- [ ] EAS Build for TestFlight distribution
