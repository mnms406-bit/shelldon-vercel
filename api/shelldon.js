const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export default async function handler(req, res) {
  const { message } = req.query;

  const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN;
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;

  let reply =
    "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  if (message?.toLowerCase().includes("product")) {
    if (!SHOPIFY_TOKEN || !SHOPIFY_STORE) {
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
        return res.status(500).json({ reply: "Error fetching products from Shopify." });
      }

      const data = await response.json();
      if (data.products && data.products.length > 0) {
        reply = `Our first product is: ${data.products[0].title}`;
      } else {
        reply = "No products found in Shopify store.";
      }
    } catch (error) {
      return res.status(500).json({ reply: "Error fetching products from Shopify." });
    }
  }

  res.status(200).json({ reply });
}
