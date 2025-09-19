import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const shop = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_API_TOKEN;

    console.log("🔍 Using shop:", shop);
    console.log("🔍 Token present:", !!token); // true/false, not showing key

    const url = `https://${shop}/admin/api/2025-01/products.json?limit=1`;

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });

    console.log("🔍 Shopify status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify error ${response.status}: ${text}`);
    }

    const data = await response.json();
    res.status(200).json({ reply: "Products fetched!", products: data });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ reply: "Error fetching products from Shopify." });
  }
}
