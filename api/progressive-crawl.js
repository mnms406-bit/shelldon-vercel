import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const API_VERSION = "2023-04"; // ✅ compatible with older Shopify stores

// How many items per chunk (keep small for serverless)
const CHUNK_SIZE = 20;

export default async function handler(req, res) {
  try {
    console.log("🕷️ Starting progressive crawl...");

    // Check if store domain is available
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      throw new Error("Missing Shopify domain or Storefront API key in environment variables.");
    }

    const crawledData = {
      timestamp: new Date().toISOString(),
      products: [],
      collections: [],
      pages: [],
    };

    // --- Fetch Products ---
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        {
          products(first: ${CHUNK_SIZE}${cursor ? `, after: "${cursor}"` : ""}) {
            edges {
              cursor
              node {
                id
                title
                handle
                description
                updatedAt
                onlineStoreUrl
              }
            }
            pageInfo { hasNextPage }
          }
        }
      `;

      const response = await shopifyFetch(query);
      const data = await response.json();

      if (!data.data || !data.data.products) break;

      const edges = data.data.products.edges;
      crawledData.products.push(...edges.map(e => e.node));

      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = hasNextPage ? edges[edges.length - 1].cursor : null;
    }

    // --- Fetch Collections ---
    hasNextPage = true;
    cursor = null;
    while (hasNextPage) {
      const query = `
        {
          collections(first: ${CHUNK_SIZE}${cursor ? `, after: "${cursor}"` : ""}) {
            edges {
              cursor
              node {
                id
                title
                handle
                updatedAt
              }
            }
            pageInfo { hasNextPage }
          }
        }
      `;

      const response = await shopifyFetch(query);
      const data = await response.json();

      if (!data.data || !data.data.collections) break;

      const edges = data.data.collections.edges;
      crawledData.collections.push(...edges.map(e => e.node));

      hasNextPage = data.data.collections.pageInfo.hasNextPage;
      cursor = hasNextPage ? edges[edges.length - 1].cursor : null;
    }

    // --- Fetch Pages ---
    const pageQuery = `
      {
        pages(first: 50) {
          edges {
            node {
              id
              title
              handle
              bodySummary
              updatedAt
            }
          }
        }
      }
    `;
    const pagesResponse = await shopifyFetch(pageQuery);
    const pagesData = await pagesResponse.json();
    crawledData.pages = pagesData.data?.pages?.edges?.map(e => e.node) || [];

    // --- Save Crawl File ---
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawledData, null, 2));

    console.log("✅ Crawl complete:", crawledData.products.length, "products");
    return res.status(200).json({ status: "success", file: filePath });
  } catch (err) {
    console.error("❌ Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}

// --- Helper Function ---
async function shopifyFetch(query) {
  return fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
    },
    body: JSON.stringify({ query }),
  });
}
