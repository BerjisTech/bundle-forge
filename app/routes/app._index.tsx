import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getDashboardMetrics } from "../lib/analytics/aggregator.server";
import { formatCurrency, formatCompact, formatPercentage } from "../lib/utils/formatting";
import { BUNDLE_TYPE_ICONS } from "../lib/utils/constants";
import styles from "../styles/dashboard.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("range") || "last_30";

  // Ensure shop record exists
  let shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    shop = await db.shop.create({
      data: { shopDomain: session.shop },
    });
  }

  const metrics = await getDashboardMetrics(shop.id, dateRange);

  return { metrics, shopDomain: session.shop, dateRange };
};

export default function Dashboard() {
  const { metrics, dateRange } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Dashboard">
      <s-button slot="primary-action" href="/app/bundles/new">
        Create Bundle
      </s-button>

      {/* Date Range Selector */}
      <s-section>
        <s-stack direction="inline" gap="base">
          {[
            { value: "today", label: "Today" },
            { value: "last_7", label: "7 days" },
            { value: "last_30", label: "30 days" },
            { value: "last_90", label: "90 days" },
          ].map((range) => (
            <s-button
              key={range.value}
              variant={dateRange === range.value ? "primary" : "tertiary"}
              href={`/app?range=${range.value}`}
            >
              {range.label}
            </s-button>
          ))}
        </s-stack>
      </s-section>

      {/* Metric Cards */}
      <s-section>
        <div className={styles["dashboard-grid"]}>
          <MetricCard
            label="Bundle Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            trend={null}
          />
          <MetricCard
            label="Conversion Rate"
            value={formatPercentage(metrics.conversionRate, false)}
            trend={null}
          />
          <MetricCard
            label="Total Impressions"
            value={formatCompact(metrics.totalImpressions)}
            trend={null}
          />
          <MetricCard
            label="Active Bundles"
            value={String(metrics.activeBundles)}
            trend={null}
          />
        </div>
      </s-section>

      {/* Revenue Chart */}
      <s-section heading="Revenue Over Time">
        <div className={styles["chart-container"]}>
          {metrics.revenueByDay.length > 0 ? (
            <RevenueChart data={metrics.revenueByDay} />
          ) : (
            <div className={styles["empty-state"]}>
              <div className={styles["empty-state__icon"]}>📊</div>
              <div className={styles["empty-state__title"]}>No data yet</div>
              <div className={styles["empty-state__description"]}>
                Revenue data will appear here once your bundles start generating conversions.
              </div>
            </div>
          )}
        </div>
      </s-section>

      {/* Top Performing Bundles */}
      <s-section heading="Top Performing Bundles">
        {metrics.topBundles.length > 0 ? (
          <div className={styles["top-bundles"]}>
            <table className={styles["top-bundles__table"]}>
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Type</th>
                  <th>Impressions</th>
                  <th>Conversions</th>
                  <th>Revenue</th>
                  <th>Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topBundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td>
                      <Link to={`/app/bundles/${bundle.id}`} className={styles["top-bundles__name"]}>
                        {bundle.name}
                      </Link>
                    </td>
                    <td>
                      <span className={styles["type-badge"]}>
                        {BUNDLE_TYPE_ICONS[bundle.type] || "📦"}{" "}
                      </span>
                    </td>
                    <td>{formatCompact(bundle.impressions)}</td>
                    <td>{formatCompact(bundle.conversions)}</td>
                    <td>{formatCurrency(bundle.revenue)}</td>
                    <td>{formatPercentage(bundle.conversionRate, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles["empty-state"]}>
            <div className={styles["empty-state__icon"]}>📦</div>
            <div className={styles["empty-state__title"]}>No bundles yet</div>
            <div className={styles["empty-state__description"]}>
              Create your first product bundle to start tracking performance.
            </div>
            <s-button href="/app/bundles/new">Create Your First Bundle</s-button>
          </div>
        )}
      </s-section>

      {/* Quick Actions */}
      <s-section slot="aside" heading="Quick Actions">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Link to="/app/bundles/new" className={styles["quick-action-card"]}>
            <div className={styles["quick-action-card__icon"]}>📦</div>
            <div className={styles["quick-action-card__title"]}>Create Bundle</div>
            <div className={styles["quick-action-card__description"]}>
              Build a new product bundle with discounts
            </div>
          </Link>
          <Link to="/app/volume-rules" className={styles["quick-action-card"]}>
            <div className={styles["quick-action-card__icon"]}>📈</div>
            <div className={styles["quick-action-card__title"]}>Volume Discounts</div>
            <div className={styles["quick-action-card__description"]}>
              Set up tiered pricing for bulk purchases
            </div>
          </Link>
          <Link to="/app/analytics" className={styles["quick-action-card"]}>
            <div className={styles["quick-action-card__icon"]}>📊</div>
            <div className={styles["quick-action-card__title"]}>View Analytics</div>
            <div className={styles["quick-action-card__description"]}>
              Dive deep into your bundle performance data
            </div>
          </Link>
        </div>
      </s-section>

      <s-section slot="aside" heading="Getting Started">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/bundles/new">Create your first bundle</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/volume-rules">Set up volume discounts</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">Configure your preferences</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

// ─── Metric Card Component ───

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: { value: number; direction: "up" | "down" | "neutral" } | null;
}) {
  return (
    <div className={styles["metric-card"]}>
      <div className={styles["metric-card__label"]}>{label}</div>
      <div className={styles["metric-card__value"]}>{value}</div>
      {trend && (
        <div
          className={`${styles["metric-card__trend"]} ${
            styles[`metric-card__trend--${trend.direction}`]
          }`}
        >
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "–"}{" "}
          {formatPercentage(Math.abs(trend.value), false)}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Chart Component (SVG-based) ───

function RevenueChart({ data }: { data: Array<{ date: string; revenue: number; conversions: number }> }) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (d.revenue / maxRevenue) * chartHeight,
    revenue: d.revenue,
    date: d.date,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="bundleAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padding.top + chartHeight - frac * chartHeight;
        return (
          <g key={frac}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              ${Math.round(maxRevenue * frac)}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#bundleAreaGradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="#6366f1"
          stroke="white"
          strokeWidth="1.5"
        />
      ))}

      {/* X-axis labels */}
      {points
        .filter((_, i) => i % Math.max(Math.floor(points.length / 6), 1) === 0)
        .map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fill="#94a3b8"
          >
            {new Date(p.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </text>
        ))}
    </svg>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
