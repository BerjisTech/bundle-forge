import { useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import styles from "../styles/builder.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  let shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    shop = await db.shop.create({
      data: { shopDomain: session.shop },
    });
  }

  return {
    settings: {
      currency: shop.currency,
      brandColor: shop.brandColor,
      accentColor: shop.accentColor,
      defaultDiscount: shop.defaultDiscount,
      defaultHeadline: shop.defaultHeadline,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  const currency = (formData.get("currency") as string) || "USD";
  const brandColor = (formData.get("brandColor") as string) || "#6366F1";
  const accentColor = (formData.get("accentColor") as string) || "#0D9488";
  const defaultDiscount = parseFloat(formData.get("defaultDiscount") as string) || 10;
  const defaultHeadline = (formData.get("defaultHeadline") as string) || "Complete the look";

  await db.shop.update({
    where: { id: shop.id },
    data: {
      currency,
      brandColor,
      accentColor,
      defaultDiscount,
      defaultHeadline,
    },
  });

  return { success: true };
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Settings saved!");
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="Settings">
      <s-section>
        <fetcher.Form method="post">
          {fetcher.data && "error" in fetcher.data && (
            <s-banner tone="critical">
              {fetcher.data.error}
            </s-banner>
          )}

          {/* General Settings */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>General</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Currency</label>
                <select
                  className={styles["form-field__select"]}
                  name="currency"
                  defaultValue={settings.currency}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="KES">KES (KSh)</option>
                </select>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Default Discount (%)</label>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  name="defaultDiscount"
                  min={0}
                  max={100}
                  defaultValue={settings.defaultDiscount}
                />
                <div className={styles["form-field__hint"]}>
                  Default discount applied when creating new bundles
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Branding</div>
            <div className={styles["form-row"]}>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Primary Color</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="color"
                    name="brandColor"
                    defaultValue={settings.brandColor}
                    style={{ width: "40px", height: "36px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                  />
                  <input
                    className={styles["form-field__input"]}
                    type="text"
                    defaultValue={settings.brandColor}
                    style={{ flex: 1 }}
                    readOnly
                  />
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Accent Color</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={settings.accentColor}
                    style={{ width: "40px", height: "36px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                  />
                  <input
                    className={styles["form-field__input"]}
                    type="text"
                    defaultValue={settings.accentColor}
                    style={{ flex: 1 }}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bundle Display Defaults */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Bundle Display Defaults</div>
            <div className={styles["form-field"]}>
              <label className={styles["form-field__label"]}>Default Headline</label>
              <input
                className={styles["form-field__input"]}
                type="text"
                name="defaultHeadline"
                defaultValue={settings.defaultHeadline}
                placeholder="e.g., Complete the look"
              />
              <div className={styles["form-field__hint"]}>
                This headline is used as the default when creating new bundles
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={styles["form-section"]}>
            <div className={styles["form-section__title"]}>Preview</div>
            <div
              style={{
                border: "1px solid var(--p-color-border)",
                borderRadius: "10px",
                padding: "1.25rem",
                maxWidth: "320px",
              }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {settings.defaultHeadline}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      border: "1px solid var(--p-color-border-subdued)",
                      background: "var(--p-color-bg-surface-secondary)",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.35rem 0.75rem",
                  background: `${settings.brandColor}15`,
                  color: settings.brandColor,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  borderRadius: "100px",
                }}
              >
                {settings.defaultDiscount}% off bundle
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <s-button variant="primary" type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Save Settings
            </s-button>
          </div>
        </fetcher.Form>
      </s-section>

      {/* App Info */}
      <s-section slot="aside" heading="About BundleForge">
        <s-unordered-list>
          <s-list-item>
            <s-text>Version: 1.0.0</s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Framework: React Router</s-text>
          </s-list-item>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">
              Shopify Admin API
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Support">
        <s-paragraph>
          <s-text>
            Need help? Reach out to our support team for assistance with bundles, volume discounts, or any technical issues.
          </s-text>
        </s-paragraph>
        <s-button href="mailto:support@berjis.tech" variant="tertiary">
          Contact Support
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
