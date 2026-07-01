import { useState, useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import styles from "../styles/builder.module.css";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { error: "Shop not found" };

  const name = formData.get("name") as string;
  const status = (formData.get("status") as string) || "draft";

  if (!name) return { error: "Rule name is required" };

  const tiersJson = formData.get("tiers") as string;
  let tiers: Array<{
    minQuantity: number;
    maxQuantity: number | null;
    discountType: string;
    discountValue: number;
    label: string;
  }> = [];

  try {
    tiers = JSON.parse(tiersJson || "[]");
  } catch {
    return { error: "Invalid tier data" };
  }

  if (tiers.length === 0) {
    return { error: "At least one tier is required" };
  }

  const rule = await db.volumeRule.create({
    data: {
      shopId: shop.id,
      name,
      status,
      tiers: {
        create: tiers.map((t, i) => ({
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          discountType: t.discountType,
          discountValue: t.discountValue,
          label: t.label || null,
          sortOrder: i,
        })),
      },
    },
  });

  return { success: true, ruleId: rule.id };
};

interface TierRow {
  minQuantity: string;
  maxQuantity: string;
  discountType: string;
  discountValue: string;
  label: string;
}

export default function NewVolumeRulePage() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [name, setName] = useState("");
  const [tiers, setTiers] = useState<TierRow[]>([
    { minQuantity: "2", maxQuantity: "4", discountType: "percentage", discountValue: "5", label: "Starter" },
    { minQuantity: "5", maxQuantity: "9", discountType: "percentage", discountValue: "10", label: "Popular" },
    { minQuantity: "10", maxQuantity: "", discountType: "percentage", discountValue: "15", label: "Best Value" },
  ]);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      shopify.toast.show("Volume rule created!");
      navigate("/app/volume-rules");
    }
  }, [fetcher.data, shopify, navigate]);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const lastMax = lastTier ? parseInt(lastTier.maxQuantity) || parseInt(lastTier.minQuantity) + 4 : 1;
    setTiers([
      ...tiers,
      {
        minQuantity: String(lastMax + 1),
        maxQuantity: "",
        discountType: "percentage",
        discountValue: "20",
        label: "",
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof TierRow, value: string) => {
    setTiers(tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = (status: string) => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("status", status);
    formData.set(
      "tiers",
      JSON.stringify(
        tiers.map((t) => ({
          minQuantity: parseInt(t.minQuantity) || 1,
          maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity) : null,
          discountType: t.discountType,
          discountValue: parseFloat(t.discountValue) || 0,
          label: t.label,
        })),
      ),
    );
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <s-page heading="Create Volume Rule" back-action="/app/volume-rules">
      <s-button
        slot="primary-action"
        onClick={() => handleSubmit("active")}
        {...(isSubmitting ? { loading: true } : {})}
      >
        Save & Activate
      </s-button>
      <s-button
        slot="secondary-action"
        onClick={() => handleSubmit("draft")}
        variant="tertiary"
        {...(isSubmitting ? { loading: true } : {})}
      >
        Save as Draft
      </s-button>

      {fetcher.data && "error" in fetcher.data && (
        <s-section>
          <s-banner tone="critical">{fetcher.data.error}</s-banner>
        </s-section>
      )}

      <s-section>
        <div className={styles["form-section"]}>
          <div className={styles["form-section__title"]}>Rule Details</div>
          <div className={styles["form-field"]}>
            <label className={styles["form-field__label"]}>Rule Name</label>
            <input
              className={styles["form-field__input"]}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., T-Shirt Volume Discount"
            />
          </div>
        </div>

        <div className={styles["form-section"]}>
          <div className={styles["form-section__title"]}>Pricing Tiers</div>
          <s-paragraph>
            <s-text>
              Define quantity-based pricing tiers. Customers buying more items get bigger discounts.
            </s-text>
          </s-paragraph>

          {tiers.map((tier, index) => (
            <div key={index} className={styles["tier-row"]}>
              <div>
                <div className={styles["tier-row__label"]}>Min Qty</div>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  min={1}
                  value={tier.minQuantity}
                  onChange={(e) => updateTier(index, "minQuantity", e.target.value)}
                />
              </div>
              <div>
                <div className={styles["tier-row__label"]}>Max Qty</div>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  min={0}
                  value={tier.maxQuantity}
                  onChange={(e) => updateTier(index, "maxQuantity", e.target.value)}
                  placeholder="∞"
                />
              </div>
              <div>
                <div className={styles["tier-row__label"]}>Type</div>
                <select
                  className={styles["form-field__select"]}
                  value={tier.discountType}
                  onChange={(e) => updateTier(index, "discountType", e.target.value)}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <div className={styles["tier-row__label"]}>Value</div>
                <input
                  className={styles["form-field__input"]}
                  type="number"
                  min={0}
                  value={tier.discountValue}
                  onChange={(e) => updateTier(index, "discountValue", e.target.value)}
                />
              </div>
              <div>
                <div className={styles["tier-row__label"]}>Label</div>
                <input
                  className={styles["form-field__input"]}
                  type="text"
                  value={tier.label}
                  onChange={(e) => updateTier(index, "label", e.target.value)}
                  placeholder="e.g., Best Value"
                />
              </div>
              <div>
                <div className={styles["tier-row__label"]}>&nbsp;</div>
                <button
                  className={styles["product-item__remove"]}
                  onClick={() => removeTier(index)}
                  type="button"
                  style={{ marginTop: "0.25rem" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "0.75rem" }}>
            <s-button onClick={addTier} variant="tertiary">
              Add Tier
            </s-button>
          </div>
        </div>

        {/* Preview */}
        <div className={styles["form-section"]}>
          <div className={styles["form-section__title"]}>Preview</div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {tiers.map((tier, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  textAlign: "center",
                  padding: "1rem",
                  border: tier.label?.toLowerCase().includes("popular") || tier.label?.toLowerCase().includes("best")
                    ? "2px solid #6366f1"
                    : "1px solid var(--p-color-border)",
                  borderRadius: "10px",
                  background: tier.label?.toLowerCase().includes("popular") || tier.label?.toLowerCase().includes("best")
                    ? "#eef2ff"
                    : "var(--p-color-bg-surface)",
                  position: "relative",
                }}
              >
                {tier.label && (
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#6366f1",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {tier.label}
                  </div>
                )}
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--p-color-text)" }}>
                  {tier.discountType === "percentage" ? `${tier.discountValue}%` : `$${tier.discountValue}`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--p-color-text-secondary)", marginTop: "0.25rem" }}>
                  Buy {tier.minQuantity}{tier.maxQuantity ? `–${tier.maxQuantity}` : "+"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
