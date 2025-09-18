import fetch from "node-fetch";

// Use environment variables instead of hardcoding sensitive info
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;

export default async function handler(req, res) {
  const message = req.query.message || "";
  let reply = "Sorry, I don't understand that.";

  // Example: respond when user asks about products
  if (/product/i.test(message)) {
    try {
      const shopifyRes = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2025-01/products.json`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await shopifyRes.json();
      if (data.products && data.products.length > 0) {
        reply = `Our first product is: ${data.products[0].title}`;
      }
