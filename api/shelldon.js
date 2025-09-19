import fetch from "node-fetch";

export default async function handler(req, res) {
  const { message } = req.query;

  // ✅ Debug log: check if env variable exists
  console.log("DEBUG - SHOPIFY_STORE_DOMAIN:", process.env.SHOPIFY_STORE_DOMAIN);
  console.log(
    "DEBUG - SHOPIFY_ADMIN_API_TOKEN length:",
    process.env.SHOPIFY_ADMIN_API_TOKEN
      ? process.env.SHOPIFY_ADMIN_API_TOKEN.length
      : "MISSING"
  );

  if (message.toLowerCase().includes("product")) {
    try {
      const response = await fetch(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-01/products.json?limit=1`,
        {
          headers: {
            "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
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
      return res.status(200).json({ reply: JSON.stringify(data) });
    } catch (error) {
      console.error("Fetch error:", error);
      return res.status(500).json({ reply: "Error fetching products from Shopify." });
    }
  }

  res.status(200).json({
    reply: "Hi! I’m Shelldon, your virtual assistant. Ask me about products!",
  });
}
