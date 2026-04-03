# BundleForge — Smart Bundles & Volume Discount App

Build a production-quality MVP for **BundleForge** that helps merchants increase AOV through product bundles, volume discounts, and buy-X-get-Y offers.

## User Review Required

> [!IMPORTANT]
> **Scopes**: The current `shopify.app.toml` has `write_products,write_metaobjects,write_metaobject_definitions`. BundleForge will need `read_products` at minimum. I'll update to `write_products,read_products` — the template already has `write_products`. Let me know if you want additional scopes (e.g., `read_collections`, `read_orders` for analytics).

> [!IMPORTANT]
> **Port Selection**: After-pulse uses port `6300`. I'll use **port `6400`** for bundle-forge and add `bundle-forge.berjis.tech → localhost:6400` to cloudflared config. This doesn't conflict with any existing entries.

> [!WARNING]
> **Template cleanup**: The existing `app._index.tsx` is the Shopify demo template (product generator). I'll replace it entirely with the BundleForge dashboard. The `app.additional.tsx` route and demo metafield/metaobject config in `shopify.app.toml` will also be removed.

## Proposed Changes

### Prisma Schema & Database

#### [MODIFY] [schema.prisma](file:///e:/Berjis/Apps/Shopify/bundle-forge/prisma/schema.prisma)

Replace the bare `Session` model with a full BundleForge schema:

- **Session** — unchanged (required by Shopify)
- **Shop** — shop settings (currency, brand colors, plan)
- **Bundle** — core entity: name, type (`fixed` | `dynamic` | `bogo`), status, discount config, display text, denormalized metrics
- **BundleProduct** — join table: bundle → Shopify product GID, with sort order and quantity config
- **VolumeRule** — tiered pricing rules: min qty, discount type/value, linked to specific products/collections
- **AnalyticsEvent** — impression/click/conversion/dismiss events per bundle, with revenue tracking

---

### Utility Library (`app/lib/`)

Following the same structure as AfterPulse:

#### [NEW] `app/lib/utils/formatting.ts`
Copy and extend from AfterPulse — `formatCurrency`, `formatCompact`, `formatPercentage`, `formatDate`, `formatRelativeTime`, `calcConversionRate`, `truncate`, `safeJsonParse`.

#### [NEW] `app/lib/utils/constants.ts`
Bundle-specific labels and constants:
- `BUNDLE_TYPE_LABELS`: `{ fixed: "Fixed Bundle", dynamic: "Dynamic Bundle", bogo: "Buy X Get Y" }`
- `BUNDLE_STATUS_LABELS`: `{ draft: "Draft", active: "Active", paused: "Paused", archived: "Archived" }`
- `DISCOUNT_TYPE_LABELS`: `{ percentage: "Percentage Off", fixed: "Fixed Amount Off", free_shipping: "Free Shipping" }`

#### [NEW] `app/lib/bundles/types.ts`
TypeScript interfaces for `DashboardMetrics`, `BundleFormData`, `VolumeRuleFormData`, `TopBundleMetric`.

#### [NEW] `app/lib/analytics/aggregator.server.ts`
Server-side analytics aggregation: `getDashboardMetrics(shopId, dateRange)` — returns totals, revenue by day, top bundles, conversion rates.

---

### CSS Module Styles (`app/styles/`)

#### [NEW] `app/styles/dashboard.module.css`
Based on AfterPulse's dashboard CSS — metric cards grid, chart container, empty states, quick action cards, status badges. Uses Polaris CSS custom properties for theming.

#### [NEW] `app/styles/bundles.module.css`
Bundle list table styles, filter bar, bundle type badges, action buttons.

#### [NEW] `app/styles/builder.module.css`
Bundle builder form styles — product picker area, volume tier rows, preview panel.

#### [NEW] `app/styles/analytics.module.css`
Analytics page — chart containers, breakdown tables, date pickers.

---

### Routes

#### [MODIFY] [app.tsx](file:///e:/Berjis/Apps/Shopify/bundle-forge/app/routes/app.tsx)
Update navigation to BundleForge pages:
- Dashboard (`/app`)
- Bundles (`/app/bundles`)
- Volume Discounts (`/app/volume-rules`)
- Analytics (`/app/analytics`)
- Settings (`/app/settings`)

#### [MODIFY] [app._index.tsx](file:///e:/Berjis/Apps/Shopify/bundle-forge/app/routes/app._index.tsx)
**Complete rewrite** → BundleForge Dashboard:
- 4 metric cards: Bundle Revenue, Conversion Rate, Total Impressions, Active Bundles
- Revenue over time SVG chart (same pattern as AfterPulse)
- Top performing bundles table
- Quick actions sidebar (Create Bundle, Volume Rules, Analytics)
- Date range selector (Today, 7d, 30d, 90d)

#### [DELETE] [app.additional.tsx](file:///e:/Berjis/Apps/Shopify/bundle-forge/app/routes/app.additional.tsx)
Remove template demo page.

#### [NEW] `app/routes/app.bundles.tsx`
Bundle list page with:
- Filter by status (All, Active, Draft, Paused, Archived)
- Table: Name, Type, Status, Products, Impressions, Conversions, Revenue, Actions
- Empty state with CTA
- Actions: Activate/Pause/Edit/Delete

#### [NEW] `app/routes/app.bundles_.new.tsx`
Bundle builder page:
- Name, Type selector (Fixed / Dynamic / BOGO)
- Product picker using Shopify resource picker
- Discount configuration (percentage/fixed/free shipping)
- Targeting rules (min order, customer tags)
- Display configuration (headline, description)
- Preview panel
- Save as draft or activate

#### [NEW] `app/routes/app.bundles_.$id.tsx`
Edit existing bundle — same form as new, pre-populated with data. Also shows per-bundle analytics.

#### [NEW] `app/routes/app.volume-rules.tsx`
Volume discount rules page:
- List of rules with tier breakdown
- Create/edit inline
- Rule: min qty → discount type → discount value
- Target: specific products or "all products"

#### [NEW] `app/routes/app.volume-rules_.new.tsx`
Create new volume rule with tiered pricing configuration.

#### [NEW] `app/routes/app.analytics.tsx`
Analytics page:
- Overview metrics
- Revenue & conversion charts
- Per-bundle breakdown table
- Date range filtering

#### [NEW] `app/routes/app.settings.tsx`
Settings page:
- Currency preference
- Brand colors
- Default discount settings
- Bundle display defaults

---

### Shopify App Configuration

#### [MODIFY] [shopify.app.toml](file:///e:/Berjis/Apps/Shopify/bundle-forge/shopify.app.toml)
- Update scopes to `write_products,read_products`
- Remove demo metafield/metaobject definitions
- Keep webhook subscriptions

---

### Cloudflared Tunnel

#### [MODIFY] `~/.cloudflared/config.yml`
Add entry right after `after-pulse.berjis.tech`:
```yaml
  - hostname: bundle-forge.berjis.tech
    service: http://localhost:6400
```

---

## Open Questions

> [!IMPORTANT]
> 1. **Port 6400** — does this work for you, or do you prefer a different port?
> 2. **Scopes** — do you want `read_collections` and/or `read_orders` added?
> 3. **Should I add a checkout UI extension** for bundle display, or just focus on the admin app for now?

## Verification Plan

### Automated Tests
- Run `npx prisma generate` and `npx prisma migrate dev` to verify schema
- Run `npm run build` to verify all routes compile
- Type-check with `npm run typecheck`

### Manual Verification
- Start dev server at port 6400
- Verify all routes render in the Shopify admin
