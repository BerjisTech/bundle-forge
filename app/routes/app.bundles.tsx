import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import {
  formatCurrency,
  formatCompact,
  formatPercentage,
  calcConversionRate,
  formatDiscount,
} from "../lib/utils/formatting";
import {
  BUNDLE_TYPE_LABELS,
  BUNDLE_TYPE_ICONS,
  BUNDLE_STATUS_LABELS,
  STATUS_FILTERS,
} from "../lib/utils/constants";
import styles from "../styles/bundles.module.css";
import dashStyles from "../styles/dashboard.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { bundles: [], total: 0, status };
  }

  const where: Record<string, unknown> = { shopId: shop.id };
  if (status !== "all") {
    where.status = status;
  }

  const [bundles, total] = await Promise.all([
    db.bundle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          take: 4,
          select: { title: true, imageUrl: true },
        },
        _count: { select: { products: true } },
      },
    }),
    db.bundle.count({ where }),
  ]);

  return { bundles, total, status };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { error: "Shop not found" };
  }

  if (intent === "delete") {
    const bundleId = formData.get("bundleId") as string;
    await db.bundle.delete({ where: { id: bundleId } });
    return { success: true };
  }

  if (intent === "updateStatus") {
    const bundleId = formData.get("bundleId") as string;
    const newStatus = formData.get("status") as string;
    await db.bundle.update({
      where: { id: bundleId },
      data: { status: newStatus },
    });
    return { success: true };
  }

  return { error: "Unknown action" };
};

export default function BundlesPage() {
  const { bundles, total, status } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <s-page heading="Bundles">
      <s-button slot="primary-action" href="/app/bundles/new">
        Create Bundle
      </s-button>

      <s-section>
        {/* Filters */}
        <div className={styles["bundles-filters"]}>
          <s-stack direction="inline" gap="base">
            {STATUS_FILTERS.map((opt) => (
              <s-button
                key={opt.value}
                variant={status === opt.value ? "primary" : "tertiary"}
                href={`/app/bundles?status=${opt.value}`}
              >
                {opt.label}
              </s-button>
            ))}
          </s-stack>
        </div>

        {/* Bundles Table */}
        {bundles.length > 0 ? (
          <>
            <s-paragraph>
              <s-text>
                Showing {bundles.length} of {total} bundles
              </s-text>
            </s-paragraph>
            <table className={styles["bundles-table"]}>
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Impressions</th>
                  <th>Conversions</th>
                  <th>Revenue</th>
                  <th>Conv. Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td>
                      <Link
                        to={`/app/bundles/${bundle.id}`}
                        className={styles["bundles-table__name"]}
                      >
                        <span>{bundle.name}</span>
                        <span className={styles["bundles-table__name-sub"]}>
                          {formatDiscount(bundle.discountType, bundle.discountValue)}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className={styles["bundles-table__type"]}>
                        {BUNDLE_TYPE_ICONS[bundle.type] || "📦"}{" "}
                        {BUNDLE_TYPE_LABELS[bundle.type] || bundle.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${dashStyles["status-badge"]} ${
                          dashStyles[`status-badge--${bundle.status}`]
                        }`}
                      >
                        {BUNDLE_STATUS_LABELS[bundle.status] || bundle.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles["product-avatars"]}>
                        {bundle.products.map((p, i) => (
                          <div
                            key={i}
                            className={styles["product-avatar"]}
                            style={{
                              background: p.imageUrl
                                ? `url(${p.imageUrl}) center/cover`
                                : "var(--p-color-bg-surface-secondary)",
                            }}
                            title={p.title}
                          />
                        ))}
                        {bundle._count.products > 4 && (
                          <div className={styles["product-avatar--more"]}>
                            +{bundle._count.products - 4}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{formatCompact(bundle.impressions)}</td>
                    <td>{formatCompact(bundle.conversions)}</td>
                    <td>{formatCurrency(bundle.revenue)}</td>
                    <td>
                      {formatPercentage(
                        calcConversionRate(bundle.impressions, bundle.conversions),
                        false,
                      )}
                    </td>
                    <td className={styles["actions-cell"]}>
                      <s-stack direction="inline" gap="tight">
                        {bundle.status === "draft" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="bundleId" value={bundle.id} />
                            <input type="hidden" name="status" value="active" />
                            <s-button variant="primary" type="submit" size="slim">
                              Activate
                            </s-button>
                          </fetcher.Form>
                        )}
                        {bundle.status === "active" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="bundleId" value={bundle.id} />
                            <input type="hidden" name="status" value="paused" />
                            <s-button variant="tertiary" type="submit" size="slim">
                              Pause
                            </s-button>
                          </fetcher.Form>
                        )}
                        {bundle.status === "paused" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="bundleId" value={bundle.id} />
                            <input type="hidden" name="status" value="active" />
                            <s-button variant="primary" type="submit" size="slim">
                              Resume
                            </s-button>
                          </fetcher.Form>
                        )}
                        <s-button variant="tertiary" href={`/app/bundles/${bundle.id}`} size="slim">
                          Edit
                        </s-button>
                      </s-stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>📦</div>
            <div className={dashStyles["empty-state__title"]}>No bundles found</div>
            <div className={dashStyles["empty-state__description"]}>
              {status !== "all"
                ? `You don't have any ${status} bundles. Try a different filter or create a new one.`
                : "Create your first product bundle to increase your average order value."}
            </div>
            <s-button href="/app/bundles/new">Create Your First Bundle</s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
