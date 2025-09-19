import express from "express";
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;

app.get("/api/shelldon", async (req, res) => {
  const message = req.query.message || "";

  let reply =
    "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  if (/product/i.test(message)) {
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
        const text = await response.text();
        console.error("Shopify API error:", response.status, text);
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

  res.json({ reply });
});

app.listen(PORT, () => console.log(`Shelldon running on port ${PORT}`));
