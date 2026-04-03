// ─── BundleForge: TypeScript Types ───

export interface DashboardMetrics {
  totalRevenue: number;
  conversionRate: number;
  totalImpressions: number;
  activeBundles: number;
  activeVolumeRules: number;
  revenueByDay: Array<{ date: string; revenue: number; conversions: number }>;
  topBundles: TopBundleMetric[];
}

export interface TopBundleMetric {
  id: string;
  name: string;
  type: string;
  impressions: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface BundleFormData {
  name: string;
  type: "fixed" | "dynamic" | "bogo";
  discountType: "percentage" | "fixed" | "free_shipping" | null;
  discountValue: number | null;
  bogoTriggerQty: number | null;
  bogoRewardQty: number | null;
  bogoRewardType: "free" | "discounted" | null;
  bogoRewardValue: number | null;
  headline: string;
  description: string;
  targetMinOrder: number | null;
  targetMaxOrder: number | null;
  targetTags: string;
  products: BundleProductInput[];
}

export interface BundleProductInput {
  productId: string;
  variantId?: string;
  title: string;
  imageUrl?: string;
  price: number;
  quantity: number;
}

export interface VolumeRuleFormData {
  name: string;
  targetProducts: string; // JSON string of product GIDs
  targetCollections: string; // JSON string of collection GIDs
  tiers: VolumeTierInput[];
}

export interface VolumeTierInput {
  minQuantity: number;
  maxQuantity: number | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  label: string;
}

export interface ShopSettings {
  currency: string;
  brandColor: string;
  accentColor: string;
  defaultDiscount: number;
  defaultHeadline: string;
}
