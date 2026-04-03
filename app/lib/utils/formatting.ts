// ─── BundleForge: Formatting Utilities ───

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a compact string (e.g., 1.2K, 3.4M).
 */
export function formatCompact(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a percentage value with optional sign indicator.
 */
export function formatPercentage(
  value: number,
  showSign = true,
  decimals = 1,
): string {
  const formatted = value.toFixed(decimals);
  if (showSign && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | string,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

/**
 * Calculate conversion rate from impressions and conversions.
 */
export function calcConversionRate(
  impressions: number,
  conversions: number,
): number {
  if (impressions === 0) return 0;
  return (conversions / impressions) * 100;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Parse a JSON string safely, returning a fallback on failure.
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Format a discount display string.
 */
export function formatDiscount(type: string | null, value: number | null): string {
  if (!type || value == null) return "—";
  switch (type) {
    case "percentage":
      return `${value}% off`;
    case "fixed":
      return `$${value.toFixed(2)} off`;
    case "free_shipping":
      return "Free shipping";
    default:
      return "—";
  }
}
