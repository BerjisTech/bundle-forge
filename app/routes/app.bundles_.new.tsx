import { useState, useCallback } from "react";
import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import {
  BUNDLE_TYPE_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
} from "../lib/utils/constants";
import { formatDiscount } from "../lib/utils/formatting";
import styles from "../styles/builder.module.css";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { error: "Shop not found" };
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string || "draft";
  const discountType = formData.get("discountType") as string || null;
  const discountValue = formData.get("discountValue")
    ? parseFloat(formData.get("discountValue") as string)
    : null;
  const headline = (formData.get("headline") as string) || "Complete the look";
  const description = (formData.get("description") as string) || null;
  const bogoTriggerQty = formData.get("bogoTriggerQty")
    ? parseInt(formData.get("bogoTriggerQty") as string)
    : null;
  const bogoRewardQty = formData.get("bogoRewardQty")
    ? parseInt(formData.get("bogoRewardQty") as string)
    : null;
  const bogoRewardType = (formData.get("bogoRewardType") as string) || null;
  const bogoRewardValue = formData.get("bogoRewardValue")
    ? parseFloat(formData.get("bogoRewardValue") as string)
    : null;
  const targetMinOrder = formData.get("targetMinOrder")
    ? parseFloat(formData.get("targetMinOrder") as string)
    : null;
  const targetMaxOrder = formData.get("targetMaxOrder")
    ? parseFloat(formData.get("targetMaxOrder") as string)
    : null;
  const targetTags = (formData.get("targetTags") as string) || null;

  // Validate required fields
  if (!name || !type) {
    return { error: "Name and type are required" };
  }

  // Create the bundle
  const bundle = await db.bundle.create({
    data: {
      shopId: shop.id,
      name,
      type,
      status,
      discountType,
      discountValue,
      headline,
      description,
      bogoTriggerQty,
      bogoRewardQty,
      bogoRewardType,
      bogoRewardValue,
      targetMinOrder,
      targetMaxOrder,
      targetTags,
    },
  });

  // Parse and create products
  const productsJson = formData.get("products") as string;
  if (productsJson) {
    try {
      const products = JSON.parse(productsJson) as Array<{
        productId: string;
        variantId?: string;
        title: string;
        imageUrl?: string;
        price: number;
        quantity: number;
      }>;

      if (products.length > 0) {
        await db.bundleProduct.createMany({
          data: products.map((p, i) => ({
            bundleId: bundle.id,
            productId: p.productId,
            variantId: p.variantId || null,
            title: p.title,
            imageUrl: p.imageUrl || null,
            price: p.price,
            quantity: p.quantity || 1,
            sortOrder: i,
          })),
        });
      }
    } catch {
      // Products parsing failed, continue without products
    }
  }

  return { success: true, bundleId: bundle.id };
};

export default function NewBundlePage() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [bundleType, setBundleType] = useState<string>("fixed");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [headline, setHeadline] = useState("Complete the look");
  const [description, setDescription] = useState("");
  const [bogoTriggerQty, setBogoTriggerQty] = useState("2");
  const [bogoRewardQty, setBogoRewardQty] = useState("1");
  const [bogoRewardType, setBogoRewardType] = useState("free");
  const [bogoRewardValue, setBogoRewardValue] = useState("0");
  const [targetMinOrder, setTargetMinOrder] = useState("");
  const [targetMaxOrder, setTargetMaxOrder] = useState("");
  const [targetTags, setTargetTags] = useState("");
  const [products, setProducts] = useState<
    Array<{
      productId: string;
      variantId?: string;
      title: string;
      imageUrl?: string;
      price: number;
      quantity: number;
    }>
  >([]);

  const isSubmitting = fetcher.state !== "idle";

  // Handle success
  if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
    shopify.toast.show("Bundle created successfully!");
    navigate("/app/bundles");
  }

  const pickProducts = useCallback(async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });

      if (selected && selected.length > 0) {
        const newProducts = selected.map((product: any) => ({
          productId: product.id,
          variantId: product.variants?.[0]?.id,
          title: product.title,
          imageUrl: product.images?.[0]?.originalSrc,
          price: parseFloat(product.variants?.[0]?.price || "0"),
          quantity: 1,
        }));

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.productId));
          const uniqueNew = newProducts.filter(
            (p: { productId: string }) => !existingIds.has(p.productId),
          );
          return [...prev, ...uniqueNew];
        });
      }
    } catch {
      // User cancelled the picker
    }
  }, [shopify]);

  const removeProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p)),
    );
  };

  const handleSubmit = (status: string) => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", bundleType);
    formData.set("status", status);
    formData.set("discountType", discountType);
    formData.set("discountValue", discountValue);
    formData.set("headline", headline);
    formData.set("description", description);
    formData.set("products", JSON.stringify(products));

    if (bundleType === "bogo") {
      formData.set("bogoTriggerQty", bogoTriggerQty);
      formData.set("bogoRewardQty", bogoRewardQty);
      formData.set("bogoRewardType", bogoRewardType);
      formData.set("bogoRewardValue", bogoRewardValue);
    }

    if (targetMinOrder) formData.set("targetMinOrder", targetMinOrder);
    if (targetMaxOrder) formData.set("targetMaxOrder", targetMaxOrder);
    if (targetTags) formData.set("targetTags", targetTags);

    fetcher.submit(formData, { method: "post" });
  };

  const totalBundlePrice = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <s-page heading="Create Bundle" back-action="/app/bundles">
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
        <div className={styles["builder-layout"]}>
          {/* Main Form */}
          <div>
            {/* Bundle Type */}
            <div className={styles["form-section"]}>
              <div className={styles["form-section__title"]}>Bundle Type</div>
              <div className={styles["type-selector"]}>
                {BUNDLE_TYPE_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`${styles["type-card"]} ${
                      bundleType === opt.value ? styles["type-card--selected"] : ""
                    }`}
                    onClick={() => setBundleType(opt.value)}
                  >
                    <div className={styles["type-card__icon"]}>
                      {opt.value === "fixed" ? "📦" : opt.value === "dynamic" ? "🔀" : "🎁"}
                    </div>
                    <div className={styles["type-card__label"]}>{opt.label}</div>
                    <div className={styles["type-card__description"]}>
                      {opt.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className={styles["form-section"]}>
              <div className={styles["form-section__title"]}>Basic Information</div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Bundle Name</label>
                <input
                  className={styles["form-field__input"]}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Essentials Bundle"
                />
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Headline</label>
                <input
                  className={styles["form-field__input"]}
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Complete the look"
                />
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Description</label>
                <textarea
                  className={styles["form-field__textarea"]}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description for this bundle..."
                />
              </div>
            </div>

            {/* Products */}
            <div className={styles["form-section"]}>
              <div className={styles["form-section__title"]}>Products</div>
              {products.length > 0 && (
                <div className={styles["product-list"]}>
                  {products.map((product) => (
                    <div key={product.productId} className={styles["product-item"]}>
                      <div
                        className={styles["product-item__image"]}
                        style={
                          product.imageUrl
                            ? { background: `url(${product.imageUrl}) center/cover` }
                            : {}
                        }
                      />
                      <div className={styles["product-item__info"]}>
                        <div className={styles["product-item__title"]}>
                          {product.title}
                        </div>
                        <div className={styles["product-item__price"]}>
                          ${product.price.toFixed(2)}
                        </div>
                      </div>
                      <input
                        type="number"
                        className={styles["product-item__qty"]}
                        value={product.quantity}
                        min={1}
                        onChange={(e) =>
                          updateQuantity(product.productId, parseInt(e.target.value) || 1)
                        }
                      />
                      <button
                        className={styles["product-item__remove"]}
                        onClick={() => removeProduct(product.productId)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "0.75rem" }}>
                <s-button onClick={pickProducts} variant="tertiary">
                  {products.length > 0 ? "Add More Products" : "Select Products"}
                </s-button>
              </div>
            </div>

            {/* Discount Configuration */}
            <div className={styles["form-section"]}>
              <div className={styles["form-section__title"]}>Discount</div>

              {bundleType === "bogo" ? (
                <>
                  <div className={styles["form-row"]}>
                    <div className={styles["form-field"]}>
                      <label className={styles["form-field__label"]}>Buy Quantity</label>
                      <input
                        className={styles["form-field__input"]}
                        type="number"
                        min={1}
                        value={bogoTriggerQty}
                        onChange={(e) => setBogoTriggerQty(e.target.value)}
                      />
                      <div className={styles["form-field__hint"]}>
                        Customer must buy this many items
                      </div>
                    </div>
                    <div className={styles["form-field"]}>
                      <label className={styles["form-field__label"]}>Get Quantity</label>
                      <input
                        className={styles["form-field__input"]}
                        type="number"
                        min={1}
                        value={bogoRewardQty}
                        onChange={(e) => setBogoRewardQty(e.target.value)}
                      />
                      <div className={styles["form-field__hint"]}>
                        They get this many items as a reward
                      </div>
                    </div>
                  </div>
                  <div className={styles["form-row"]}>
                    <div className={styles["form-field"]}>
                      <label className={styles["form-field__label"]}>Reward Type</label>
                      <select
                        className={styles["form-field__select"]}
                        value={bogoRewardType}
                        onChange={(e) => setBogoRewardType(e.target.value)}
                      >
                        <option value="free">Free</option>
                        <option value="discounted">Discounted</option>
                      </select>
                    </div>
                    {bogoRewardType === "discounted" && (
                      <div className={styles["form-field"]}>
                        <label className={styles["form-field__label"]}>Reward Discount (%)</label>
                        <input
                          className={styles["form-field__input"]}
                          type="number"
                          min={0}
                          max={100}
                          value={bogoRewardValue}
                          onChange={(e) => setBogoRewardValue(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles["form-row"]}>
                  <div className={styles["form-field"]}>
                    <label className={styles["form-field__label"]}>Discount Type</label>
                    <select
                      className={styles["form-field__select"]}
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      {DISCOUNT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {discountType !== "free_shipping" && (
                    <div className={styles["form-field"]}>
                      <label className={styles["form-field__label"]}>
                        {discountType === "percentage" ? "Discount (%)" : "Discount Amount ($)"}
                      </label>
                      <input
                        className={styles["form-field__input"]}
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Targeting Rules */}
            <div className={styles["form-section"]}>
              <div className={styles["form-section__title"]}>Targeting Rules (Optional)</div>
              <div className={styles["form-row"]}>
                <div className={styles["form-field"]}>
                  <label className={styles["form-field__label"]}>Min Order Value ($)</label>
                  <input
                    className={styles["form-field__input"]}
                    type="number"
                    min={0}
                    value={targetMinOrder}
                    onChange={(e) => setTargetMinOrder(e.target.value)}
                    placeholder="No minimum"
                  />
                </div>
                <div className={styles["form-field"]}>
                  <label className={styles["form-field__label"]}>Max Order Value ($)</label>
                  <input
                    className={styles["form-field__input"]}
                    type="number"
                    min={0}
                    value={targetMaxOrder}
                    onChange={(e) => setTargetMaxOrder(e.target.value)}
                    placeholder="No maximum"
                  />
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label className={styles["form-field__label"]}>Customer Tags</label>
                <input
                  className={styles["form-field__input"]}
                  type="text"
                  value={targetTags}
                  onChange={(e) => setTargetTags(e.target.value)}
                  placeholder="e.g., vip, wholesale (comma-separated)"
                />
                <div className={styles["form-field__hint"]}>
                  Only show to customers with these tags. Leave empty for all customers.
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className={styles["preview-panel"]}>
            <div className={styles["preview-panel__title"]}>Preview</div>
            <div className={styles["preview-bundle"]}>
              <div className={styles["preview-bundle__headline"]}>
                {headline || "Complete the look"}
              </div>
              {description && (
                <div className={styles["preview-bundle__description"]}>
                  {description}
                </div>
              )}
              <div className={styles["preview-bundle__products"]}>
                {products.length > 0
                  ? products.map((p) => (
                      <div
                        key={p.productId}
                        className={styles["preview-bundle__product"]}
                        style={
                          p.imageUrl
                            ? { background: `url(${p.imageUrl}) center/cover` }
                            : {}
                        }
                        title={p.title}
                      />
                    ))
                  : Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles["preview-bundle__product"]} />
                    ))}
              </div>
              {totalBundlePrice > 0 && (
                <div style={{ fontSize: "0.85rem", color: "var(--p-color-text-secondary)", marginBottom: "0.5rem" }}>
                  Total: ${totalBundlePrice.toFixed(2)}
                </div>
              )}
              <div className={styles["preview-bundle__discount"]}>
                {bundleType === "bogo"
                  ? `Buy ${bogoTriggerQty}, Get ${bogoRewardQty} ${bogoRewardType === "free" ? "Free" : `${bogoRewardValue}% Off`}`
                  : formatDiscount(discountType, parseFloat(discountValue) || 0)}
              </div>
            </div>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
