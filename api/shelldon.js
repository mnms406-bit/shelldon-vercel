import fetch from "node-fetch";

export default async function handler(req, res) {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  console.log("Using shop:", shop);
  console.log("Using token (first 6 chars):", token ? token.slice(0, 6) + "..." : "MISSING");

  try {
    const response = await fetch(`https://${shop}/admin/api/2025-01/products.json?limit=1`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });

    const text = await response.text();

    console.log("Response status:", response.status);
    console.log("Response body (first 300 chars):", text.slice(0, 300));

    res.status(200).json({
      shop,
      status: response.status,
      body: text.slice(0, 500)
    });

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
}

