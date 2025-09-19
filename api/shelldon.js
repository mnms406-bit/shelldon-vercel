// Vercel-compatible fetch import
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Use environment variables for security
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || "51294e-8f.myshopify.com";
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN; // Your shpat_ token

export default async function handler(req, res) {
  const message = req.query.message || "";
  let reply = "Sorry, I don't understand that.";

  // If user asks about products
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
        // Shopify returned an error
        const errText = await shopifyRes.text();
        console.error("Shopify error:", errText);
        reply = `Shopify API error: ${shopifyRes.status}`;
      } else {
        const data = await shopifyRes.json();
        if (data.products && data.products.length > 0) {
          reply = `Our first product is: ${data.products[0].title}`;
        } else {
          reply = "No products found in Shopify store.";
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      reply = "Error fetching products from Shopify.";
    }
  }

  // Respond with JSON
  res.status(200).json({ reply });
}
