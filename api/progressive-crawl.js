import fs from "fs";
import path from "path";

// CONFIG
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // e.g., yourstore.myshopify.com
const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const CHUNK_SIZE = 20; // number of products/pages per request
const TEMP_DIR = "/tmp";

// Helper to fetch Shopify Storefront API
async function fetchShopify(query) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-07/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Shopify fetch failed: ${res.status}`);
  return res.json();
}

// Chunked product fetch
async function fetchProducts(cursor = null) {
  const after = cursor ? `"${cursor}"` : null;
  const query = `
    {
      products(first: ${CHUNK_SIZE}${after ? `, after: ${after}` : ""}) {
        edges {
          cursor
          node {
            id
            title
            handle
            description
            images(first:5){ edges { node { src altText } } }
            variants(first:5){ edges { node { id title price } } }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  `;
  return fetchShopify(query);
}

// Example: fetch pages in chunks
async function fetchPages(cursor = null) {
  const after = cursor ? `"${cursor}"` : null;
  const query = `
    {
      pages(first: ${CHUNK_SIZE}${after ? `, after: ${after}` : ""}) {
        edges {
          cursor
          node { id title handle body }
        }
        pageInfo { hasNextPage }
      }
    }
  `;
  return fetchShopify(query);
}

// Write JSON with timestamp
function writeData(filename, data) {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
  const filePath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify({ timestamp: new Date(), data }, null, 2));
  return filePath;
}

// API handler
export default async function handler(req, res) {
  try {
    // Optional secret for manual trigger
    const secret = req.query.secret;
    if (process.env.CRAWL_SECRET && secret !== process.env.CRAWL_SECRET) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    // Fetch Products
    let allProducts = [];
    let productCursor = null;
    let hasNext = true;
    while (hasNext) {
      const result = await fetchProducts(productCursor);
      const edges = result.data.products.edges;
      edges.forEach(e => allProducts.push(e.node));
      hasNext = result.data.products.pageInfo.hasNextPage;
      productCursor = edges.length ? edges[edges.length - 1].cursor : null;
    }

    // Fetch Pages
    let allPages = [];
    let pageCursor = null;
    hasNext = true;
    while (hasNext) {
      const result = await fetchPages(pageCursor);
      const edges = result.data.pages.edges;
      edges.forEach(e => allPages.push(e.node));
      hasNext = result.data.pages.pageInfo.hasNextPage;
      pageCursor = edges.length ? edges[edges.length - 1].cursor : null;
    }

    // You can add collections fetch here similarly

    // Combine and write
    const crawlData = { products: allProducts, pages: allPages };
    const filePath = writeData("crawl-data.json", crawlData);

    res.status(200).json({ status: "success", message: "Crawl completed", file: filePath });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
