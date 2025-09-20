// Vercel-compatible fetch import is not needed; Node 18+ has native fetch

// Hardcoded Shopify store domain
const SHOPIFY_STORE = "51294e-8f.myshopify.com";

// Token as environment variable
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;

export default async function handler(req, res) {
  const message = req.query.message || "";

  // Fallback reply
  let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  // Respond to "product" queries
  if (/product/i.test(message)) {
    try {
      const shopifyRes = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=5`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      if (!shopifyRes.ok) {
        const errText = await shopifyRes.text();
        console.error("Shopify API error:", errText);
        reply = `Error fetching products from Shopify: ${shopifyRes.status}`;
      } else {
        const data = await shopifyRes.json();
        if (data.products && data.products.length > 0) {
          reply = `Our first 5 products:\n` + data.products.map(p => p.title).join("\n");
        } else {
          reply = "No products found in Shopify store.";
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      reply = "Error fetching products from Shopify.";
    }
  }

  // Return JSON response
  res.status(200).json({ reply });
}
