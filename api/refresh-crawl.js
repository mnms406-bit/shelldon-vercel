import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  if (!shopDomain || !storefrontToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing Shopify environment variables.",
    });
  }

  const crawlData = {
    products: [],
    collections: [],
    pages: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // --- Fetch Products ---
    const productsRes = await fetch(
      `https://${shopDomain}/api/2023-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            products(first: 250) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price
                      }
                    }
                  }
                }
              }
            }
          }`,
        }),
      }
    );

    const productsJson = await productsRes.json();
    if (productsJson.errors) {
      throw new Error(JSON.stringify(productsJson.errors));
    }
    crawlData.products = productsJson.data.products.edges.map(e => e.node);

    // --- Fetch Collections ---
    const collectionsRes = await fetch(
      `https://${shopDomain}/api/2023-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            collections(first: 50) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
          }`,
        }),
      }
    );
    const collectionsJson = await collectionsRes.json();
    if (collectionsJson.errors) {
      throw new Error(JSON.stringify(collectionsJson.errors));
    }
    crawlData.collections = collectionsJson.data.collections.edges.map(e => e.node);

    // --- Fetch Pages ---
    const pagesRes = await fetch(
      `https://${shopDomain}/api/2023-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            pages(first: 50) {
              edges {
                node {
                  id
                  title
                  handle
                  body
                }
              }
            }
          }`,
        }),
      }
    );
    const pagesJson = await pagesRes.json();
    if (pagesJson.errors) {
      throw new Error(JSON.stringify(pagesJson.errors));
    }
    crawlData.pages = pagesJson.data.pages.edges.map(e => e.node);

    // --- Save Crawl Data ---
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    return res.status(200).json({
      status: "success",
      message: "Crawl completed successfully",
      counts: {
        products: crawlData.products.length,
        collections: crawlData.collections.length,
        pages: crawlData.pages.length,
      },
      timestamp: crawlData.timestamp,
      file: filePath,
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    return res.status(500).json({
      status: "error",
      message: "Crawl failed",
      details: err.message,
    });
  }
}
