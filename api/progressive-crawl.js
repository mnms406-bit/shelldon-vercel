// api/progressive-crawl.js
export default async function handler(req, res) {
  try {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. 51294e-8f.myshopify.com
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!storeDomain || !storefrontToken) {
      return res.status(500).json({ error: "Missing Shopify credentials" });
    }

    // GraphQL query for products (adjust limit/chunk if needed)
    const query = `
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 5) {
                edges {
                  node {
                    src
                    altText
                  }
                }
              }
            }
          }
        }
        collections(first: 20) {
          edges {
            node {
              id
              title
              handle
              description
            }
          }
        }
        pages(first: 20) {
          edges {
            node {
              id
              title
              handle
              bodySummary
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${storeDomain}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify errors:", data.errors);
      return res.status(500).json({ error: data.errors });
    }

    // Instead of timestamped files, overwrite one file each time
    const result = {
      products: data.data.products.edges.map(e => e.node),
      collections: data.data.collections.edges.map(e => e.node),
      pages: data.data.pages.edges.map(e => e.node),
    };

    // Store in Vercel's function memory (if you want persistence, use a db or KV store)
    global.cachedCrawl = result;

    return res.status(200).json({ status: "success", data: result });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
