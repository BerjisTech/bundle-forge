import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div className={styles.badge}>Smart Bundles</div>
        <h1 className={styles.heading}>
          BundleForge
        </h1>
        <p className={styles.text}>
          Boost your Average Order Value with smart product bundles and volume
          discounts. Create the perfect bundle for every customer.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" placeholder="your-store.myshopify.com" />
            </label>
            <button className={styles.button} type="submit">
              Get Started
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>📦 Smart Bundles</strong>. Create fixed, dynamic, and BOGO
            bundles with flexible discount rules.
          </li>
          <li>
            <strong>📈 Volume Discounts</strong>. Tiered pricing that encourages
            customers to buy more and save more.
          </li>
          <li>
            <strong>📊 Deep Analytics</strong>. Track impressions, conversions,
            and revenue for every bundle and rule.
          </li>
        </ul>
      </div>
    </div>
  );
}
