import fetch from "node-fetch";

export default async function handler(req, res) {
  const { message } = req.query;

  // ✅ Debug: Check environment variables
  const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN;
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;

  console.log(
    "DEBUG - SHOPIFY_API_TOKEN present:",
    SHOPIFY_TOKEN ? "YES" : "MISSING"
  );
  console.log(
    "DEBUG - SHOPIFY_STORE_DOMAIN present:",
    SHOPIFY_STORE ? "YES" : "MISSING"
  );

  // Fallback greeting
  let reply =
    "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  // Respond to "product" queries
  if (message?.toLowerCase().includes("product")) {
    if (!SHOPIFY_TOKEN || !SHOPIFY_STORE) {
      console.error("❌ Missing environment variable for Shopify API.");
      return res.status(500).json({ reply: "Error: Missing Shopify credentials." });
    }

    try {
      const response = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=1`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Shopify API error:", text);
        return res.status(500).json({ reply: "Error fetching products from Shopify." });
      }

      const data = await response.json();
      if (data.products && data.products.length > 0) {
        reply = `Our first product is: ${data.products[0].title}`;
      } else {
        reply = "No products found in Shopify store.";
      }
    } catch (error) {
      console.error("Fetch error:", error);
      return res.status(500).json({ reply: "Error fetching products from Shopify." });
    }
  }

  res.status(200).json({ reply });
}
