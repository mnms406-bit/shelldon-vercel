export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  if (!shopDomain || !storefrontToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing Shopify environment variables.",
    });
  }

  const endpoint = `https://${shopDomain}/api/2024-10/graphql.json`;

  const query = `
    {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            description
            onlineStoreUrl
            featuredImage { url altText }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error ${response.status}: ${text}`);
    }

    const result = await response.json();

    // Simple sanity check
    const count = result?.data?.products?.edges?.length || 0;

    res.status(200).json({
      status: "success",
      message: `Fetched ${count} products successfully`,
      sample: result.data.products.edges.slice(0, 2),
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
