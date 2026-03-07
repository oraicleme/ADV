# Oraicle Retail Promo Designer - TODO

## Core Features

### Phase 1: Foundation & Planning
- [x] Initialize web project with db, server, user features
- [x] Plan feature architecture and data models
- [x] Set up environment variables for IO.NET API and S3

### Phase 2: Core Ad Editor UI
- [x] Create ad editor layout with left panel (controls) and right panel (preview)
- [x] Implement headline input with live character count
- [x] Implement badge text input
- [x] Implement CTA button management (add/remove/edit buttons)
- [x] Implement disclaimer text input
- [x] Build ad layout selector (Single Hero, Grid 2-6, Category Groups, Sale/Discount)
- [x] Build ad format selector (Viber/IG Story 1080x1920, Instagram Post 1080x1080, Facebook Ad 1200x628, Custom)
- [x] Implement background color picker with preset colors
- [x] Implement accent color picker with preset colors
- [x] Implement font family selector (System Sans, Georgia Serif, Courier Mono, Impact Bold, Verdana Clean)
- [x] Build real-time preview canvas that renders ad with current settings
- [x] Implement live editing (click any field to edit directly on preview)

### Phase 3: Product Data Import
- [x] Create product data import UI with tabs (Upload Excel, Paste Text, Add Manually, Load from URL)
- [x] Implement Excel/CSV file upload and parsing
- [x] Implement text paste parser (CSV format)
- [x] Implement manual product entry form
- [ ] Implement URL loader for fetching product data from websites
- [x] Build product list display with edit/delete capabilities
- [x] Create product photo upload interface
- [x] Implement image validation (PNG, SVG, JPEG, WebP)

### Phase 4: Logo & Asset Upload
- [x] Create logo upload interface
- [x] Implement multi-file upload for product photos
- [ ] Build asset preview gallery
- [x] Implement S3 upload for logos and product photos
- [x] Store asset metadata in database (url, fileKey, owner, mimeType)
- [ ] Create asset library/history for user's uploaded assets

### Phase 5: AI Design Assistant
- [x] Create AI chat interface for design suggestions
- [x] Implement Fast model toggle (quick, basic changes)
- [x] Implement Smart model toggle (holistic design decisions)
- [x] Build prompt input field for design descriptions
- [ ] Integrate IO.NET API for design generation
- [ ] Implement undo/redo functionality for AI changes
- [x] Add loading states and error handling for AI requests

### Phase 6: Ad Generation & Export
- [x] Build canvas rendering engine for ad preview
- [ ] Implement HTML export functionality
- [ ] Implement PNG export functionality
- [ ] Implement JPEG export functionality
- [ ] Create export dialog with format selection
- [ ] Build download functionality for exported ads
- [ ] Implement S3 upload for generated ads
- [ ] Create public share URLs for generated ads

### Phase 7: Ad History & Management
- [x] Create database schema for saved ads (creatives)
- [x] Build save ad functionality
- [x] Create ad history/library UI
- [x] Implement ad deletion
- [ ] Implement ad duplication (clone existing ad)
- [ ] Build search/filter for ad history
- [x] Create ad metadata display (created date, format, dimensions)

### Phase 8: Notifications & Analytics
- [x] Implement owner notification on ad creation
- [x] Implement owner notification on ad save
- [ ] Implement owner notification on errors
- [ ] Create usage analytics tracking
- [ ] Build error logging and reporting

### Phase 9: Testing & Polish
- [x] Write vitest tests for ad generation logic
- [ ] Write vitest tests for product data parsing
- [ ] Write vitest tests for export functions
- [x] Test all UI interactions
- [x] Test file uploads (various formats)
- [ ] Test S3 integration
- [ ] Test AI Design Assistant
- [ ] Performance optimization
- [ ] Accessibility audit

### Phase 10: Deployment
- [ ] Create initial checkpoint
- [ ] Deploy to production
- [ ] Verify all features work on live site
- [ ] Set up monitoring and error tracking

## Database Schema

### tables.ads (creatives)
- id (primary key)
- userId (foreign key to users)
- headline (text)
- badge (text)
- ctaButtons (JSON array)
- disclaimer (text)
- layout (enum: single-hero, grid-2-6, category-groups, sale-discount)
- format (enum: viber-ig-story, instagram-post, facebook-ad, custom)
- customWidth (int, nullable)
- customHeight (int, nullable)
- backgroundColor (text, hex color)
- accentColor (text, hex color)
- fontFamily (text)
- logoUrl (text, nullable)
- productIds (JSON array)
- generatedUrl (text, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)

### tables.products
- id (primary key)
- userId (foreign key to users)
- name (text)
- description (text, nullable)
- price (decimal, nullable)
- photoUrl (text, nullable)
- category (text, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)

### tables.assets
- id (primary key)
- userId (foreign key to users)
- type (enum: logo, product-photo, generated-ad)
- url (text)
- fileKey (text)
- mimeType (text)
- fileName (text)
- fileSize (int)
- createdAt (timestamp)

## API Endpoints (tRPC Procedures)

### Ad Management
- `ads.create` - Create new ad
- `ads.list` - Get user's ads
- `ads.get` - Get specific ad
- `ads.update` - Update ad
- `ads.delete` - Delete ad
- `ads.save` - Save ad as creative

### Product Management
- `products.create` - Add product
- `products.list` - Get user's products
- `products.delete` - Delete product
- `products.import` - Bulk import from Excel/CSV/text

### Asset Management
- `assets.list` - Get user's assets
- `assets.delete` - Delete asset
- `assets.getSignedUrl` - Get S3 presigned URL for upload

### AI Design
- `ai.generateDesign` - Call IO.NET for design suggestions
- `ai.generateAd` - Generate ad image from design

### Export
- `export.generateImage` - Generate PNG/JPEG from ad
- `export.generateHtml` - Generate HTML export

## UI Components

### Main Layout
- Header with logo, navigation, user menu
- Left sidebar: Ad editor controls
- Center: Ad preview canvas
- Right sidebar: AI assistant chat

### Editor Controls
- Headline input
- Badge input
- CTA buttons manager
- Disclaimer input
- Layout selector
- Format selector
- Color pickers
- Font selector
- AI assistant toggle

### Product Import
- Tab interface for different import methods
- File upload area
- Text input area
- Manual entry form
- URL input field

### Asset Upload
- Logo upload area
- Product photo upload area
- Asset gallery/preview

### AI Chat
- Message history
- Input field
- Model selector (Fast/Smart)
- Suggestions button
- Undo button

### Ad History
- List of saved ads
- Search/filter
- Delete/duplicate actions
- Preview thumbnails

## Notes

- All file uploads go through S3 (no local storage)
- All API calls to IO.NET use server-side credentials
- Frontend uses `VITE_FRONTEND_FORGE_API_KEY` for built-in APIs only
- Database uses MySQL via Drizzle ORM
- Real-time preview uses canvas rendering
- Export uses html2canvas or similar for image generation
