// ─── BundleForge: Analytics Aggregator (Server-side) ───

import db from "../../db.server";
import type { DashboardMetrics } from "../bundles/types";

function getDateRangeStart(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "last_7":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "last_30":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "last_90":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function getDashboardMetrics(
  shopId: string,
  dateRange: string,
): Promise<DashboardMetrics> {
  const rangeStart = getDateRangeStart(dateRange);

  // Count active bundles and volume rules
  const [activeBundles, activeVolumeRules] = await Promise.all([
    db.bundle.count({ where: { shopId, status: "active" } }),
    db.volumeRule.count({ where: { shopId, status: "active" } }),
  ]);

  // Aggregate analytics events in the date range
  const events = await db.analyticsEvent.findMany({
    where: {
      shopId,
      createdAt: { gte: rangeStart },
    },
    select: {
      eventType: true,
      revenue: true,
      createdAt: true,
      bundleId: true,
    },
  });

  const impressions = events.filter((e) => e.eventType === "impression").length;
  const conversions = events.filter((e) => e.eventType === "conversion");
  const totalRevenue = conversions.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const conversionRate =
    impressions > 0 ? (conversions.length / impressions) * 100 : 0;

  // Revenue by day
  const revenueMap = new Map<string, { revenue: number; conversions: number }>();
  for (const event of conversions) {
    const day = event.createdAt.toISOString().split("T")[0];
    const existing = revenueMap.get(day) || { revenue: 0, conversions: 0 };
    existing.revenue += event.revenue || 0;
    existing.conversions += 1;
    revenueMap.set(day, existing);
  }

  // Fill in missing days
  const revenueByDay: Array<{ date: string; revenue: number; conversions: number }> = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  for (let d = new Date(rangeStart); d <= now; d = new Date(d.getTime() + dayMs)) {
    const key = d.toISOString().split("T")[0];
    const data = revenueMap.get(key) || { revenue: 0, conversions: 0 };
    revenueByDay.push({ date: key, ...data });
  }

  // Top bundles by revenue
  const topBundles = await db.bundle.findMany({
    where: { shopId },
    orderBy: { revenue: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      type: true,
      impressions: true,
      conversions: true,
      revenue: true,
    },
  });

  return {
    totalRevenue,
    conversionRate,
    totalImpressions: impressions,
    activeBundles,
    activeVolumeRules,
    revenueByDay,
    topBundles: topBundles.map((b) => ({
      ...b,
      conversionRate: b.impressions > 0 ? (b.conversions / b.impressions) * 100 : 0,
    })),
  };
}
