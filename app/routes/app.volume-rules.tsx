import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { formatCompact, formatCurrency, formatPercentage, calcConversionRate } from "../lib/utils/formatting";
import { VOLUME_STATUS_LABELS, STATUS_FILTERS } from "../lib/utils/constants";
import dashStyles from "../styles/dashboard.module.css";
import bundleStyles from "../styles/bundles.module.css";
import builderStyles from "../styles/builder.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { rules: [], total: 0, status };
  }

  const where: Record<string, unknown> = { shopId: shop.id };
  if (status !== "all") {
    where.status = status;
  }

  const [rules, total] = await Promise.all([
    db.volumeRule.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        tiers: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.volumeRule.count({ where }),
  ]);

  return { rules, total, status };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  if (intent === "delete") {
    const ruleId = formData.get("ruleId") as string;
    await db.volumeRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  if (intent === "updateStatus") {
    const ruleId = formData.get("ruleId") as string;
    const newStatus = formData.get("status") as string;
    await db.volumeRule.update({
      where: { id: ruleId },
      data: { status: newStatus },
    });
    return { success: true };
  }

  return { error: "Unknown action" };
};

export default function VolumeRulesPage() {
  const { rules, total, status } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <s-page heading="Volume Discounts">
      <s-button slot="primary-action" href="/app/volume-rules/new">
        Create Rule
      </s-button>

      <s-section>
        {/* Filters */}
        <div className={bundleStyles["bundles-filters"]}>
          <s-stack direction="inline" gap="base">
            {STATUS_FILTERS.map((opt) => (
              <s-button
                key={opt.value}
                variant={status === opt.value ? "primary" : "tertiary"}
                href={`/app/volume-rules?status=${opt.value}`}
              >
                {opt.label}
              </s-button>
            ))}
          </s-stack>
        </div>

        {rules.length > 0 ? (
          <>
            <s-paragraph>
              <s-text>
                Showing {rules.length} of {total} rules
              </s-text>
            </s-paragraph>

            {rules.map((rule) => (
              <div key={rule.id} className={builderStyles["form-section"]} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{rule.name}</div>
                    <span
                      className={`${dashStyles["status-badge"]} ${
                        dashStyles[`status-badge--${rule.status}`]
                      }`}
                    >
                      {VOLUME_STATUS_LABELS[rule.status] || rule.status}
                    </span>
                  </div>
                  <s-stack direction="inline" gap="tight">
                    <div style={{ fontSize: "0.8rem", color: "var(--p-color-text-secondary)" }}>
                      {formatCompact(rule.impressions)} views · {formatCompact(rule.conversions)} conv. · {formatCurrency(rule.revenue)}
                    </div>
                    {rule.status === "draft" && (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="updateStatus" />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="status" value="active" />
                        <s-button variant="primary" type="submit" size="slim">Activate</s-button>
                      </fetcher.Form>
                    )}
                    {rule.status === "active" && (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="updateStatus" />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="status" value="paused" />
                        <s-button variant="tertiary" type="submit" size="slim">Pause</s-button>
                      </fetcher.Form>
                    )}
                    {rule.status === "paused" && (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="updateStatus" />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="status" value="active" />
                        <s-button variant="primary" type="submit" size="slim">Resume</s-button>
                      </fetcher.Form>
                    )}
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <s-button variant="tertiary" tone="critical" type="submit" size="slim">Delete</s-button>
                    </fetcher.Form>
                  </s-stack>
                </div>

                {/* Tiers Table */}
                {rule.tiers.length > 0 && (
                  <table className={bundleStyles["bundles-table"]} style={{ marginTop: "0.5rem" }}>
                    <thead>
                      <tr>
                        <th>Min Qty</th>
                        <th>Max Qty</th>
                        <th>Discount</th>
                        <th>Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rule.tiers.map((tier) => (
                        <tr key={tier.id}>
                          <td>{tier.minQuantity}+</td>
                          <td>{tier.maxQuantity ? tier.maxQuantity : "∞"}</td>
                          <td>
                            {tier.discountType === "percentage"
                              ? `${tier.discountValue}%`
                              : `$${tier.discountValue.toFixed(2)}`}{" "}
                            off
                          </td>
                          <td>{tier.label || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>📈</div>
            <div className={dashStyles["empty-state__title"]}>No volume rules yet</div>
            <div className={dashStyles["empty-state__description"]}>
              Create tiered pricing rules to encourage bulk purchases and increase average order value.
            </div>
            <s-button href="/app/volume-rules/new">Create Your First Rule</s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
