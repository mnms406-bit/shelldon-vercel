// Shelldon Vercel function using native fetch

const SHOPIFY_STORE = "51294e-8f.myshopify.com";
// Environment variable for security
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;

export default async function handler(req, res) {
  const message = req.query.message || "";

  // Default Shelldon greeting
  let reply =
    "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  if (/product/i.test(message)) {
    try {
      // Native fetch call to Shopify REST Admin API
      const shopifyRes = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2024-10/products.json?limit=5`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      const text = await shopifyRes.text(); // Get full response text

      if (!shopifyRes.ok) {
        // Show exact Shopify error for debugging
        reply = `Shopify API error ${shopifyRes.status}: ${text}`;
      } else {
        const data = JSON.parse(text);
        if (data.products && data.products.length > 0) {
          reply = `Our first product is: ${data.products[0].title}`;
        } else {
          reply = "No products found in Shopify store.";
        }
      }
    } catch (err) {
      reply = `Fetch error: ${err.message}`;
    }
  }

  res.status(200).json({ reply });
}
