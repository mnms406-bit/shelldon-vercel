export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Only GET allowed" });
    }

    // Basic variable check
    const { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_API_KEY } = process.env;
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      return res.status(400).json({
        error: "Missing environment variables",
        SHOPIFY_STORE_DOMAIN,
        SHOPIFY_STOREFRONT_API_KEY: !!SHOPIFY_STOREFRONT_API_KEY,
      });
    }

    // Simple Shopify test query
    const query = `{ shop { name } }`;

    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    return res.status(200).json({
      status: "success",
      message: "Serverless runtime OK",
      data,
    });
  } catch (err) {
    console.error("Crash:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
