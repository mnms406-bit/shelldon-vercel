// Vercel-compatible fetch import
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Hardcoded Shopify store
const SHOPIFY_STORE = "51294e-8f.myshopify.com";

// Token as environment variable
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;

export default async function handler(req, res) {
  const message = req.query.message || "";

  // --- DEBUG LOGS ---
  console.log("Incoming message:", message);
  console.log("SHOPIFY_API_TOKEN exists:", !!SHOPIFY_API_TOKEN);

  let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  if (/product/i.test(message)) {
    if (!SHOPIFY_API_TOKEN) {
      console.error("Missing Shopify API token!");
      reply = "Shopify API token is missing. Check your environment variables.";
    } else {
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

        console.log("Shopify response status:", shopifyRes.status);
        const rawText = await shopifyRes.text();
        console.log("Shopify raw response:", rawText);

        if (!shopifyRes.ok) {
          reply = `Shopify API error: ${shopifyRes.status}`;
        } else {
          const data = JSON.parse(rawText);
          console.log("Number of products fetched:", data.products?.length || 0);

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
  }

  res.status(200).json({ reply });
}
