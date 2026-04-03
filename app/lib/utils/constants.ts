// ─── BundleForge: Constants & Labels ───

export const BUNDLE_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed Bundle",
  dynamic: "Dynamic Bundle",
  bogo: "Buy X Get Y",
};

export const BUNDLE_TYPE_ICONS: Record<string, string> = {
  fixed: "📦",
  dynamic: "🔀",
  bogo: "🎁",
};

export const BUNDLE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage Off",
  fixed: "Fixed Amount Off",
  free_shipping: "Free Shipping",
};

export const VOLUME_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

// Default date ranges
export const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "last_7", label: "7 days" },
  { value: "last_30", label: "30 days" },
  { value: "last_90", label: "90 days" },
] as const;

// Status filter options
export const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
] as const;

// Bundle type options for forms
export const BUNDLE_TYPE_OPTIONS = [
  {
    value: "fixed",
    label: "Fixed Bundle",
    description: "A curated set of products sold together at a discount",
  },
  {
    value: "dynamic",
    label: "Dynamic Bundle",
    description: "Let customers mix-and-match from qualifying products",
  },
  {
    value: "bogo",
    label: "Buy X Get Y",
    description: "Buy a certain quantity, get additional items free or discounted",
  },
] as const;

// Discount type options for forms
export const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage Off" },
  { value: "fixed", label: "Fixed Amount Off" },
  { value: "free_shipping", label: "Free Shipping" },
] as const;
