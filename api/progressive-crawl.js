// api/progressive-crawl.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // e.g., 51294e-8f.myshopify.com
const STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const DATA_FILE = path.join("/tmp", "crawl-data.json"); // temporary JSON storage
const CHUNK_SIZE = 20; // adjust based on your site's size

async function fetchStorefront(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Queries
const PRODUCTS_QUERY = `
query ($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage, endCursor }
    edges {
      node { id, title, handle, description, images(first:5){edges{node{src,altText}}}, variants(first:5){edges{node{price}}} }
    }
  }
}`;

const COLLECTIONS_QUERY = `
query ($first: Int!, $after: String) {
  collections(first: $first, after: $after) {
    pageInfo { hasNextPage, endCursor }
    edges { node { id, title, handle, description } }
  }
}`;

const PAGES_QUERY = `
query ($first: Int!, $after: String) {
  pages(first: $first, after: $after) {
    pageInfo { hasNextPage, endCursor }
    edges { node { id, title, handle, body } }
  }
}`;

// Crawl in chunks
async function crawlAll(query, name) {
  let allItems = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const res = await fetchStorefront(query, { first: CHUNK_SIZE, after });
    if (res.errors) throw new Error(`${name} fetch error: ${JSON.stringify(res.errors)}`);

    const edges = res.data[name].edges;
    allItems.push(...edges.map(edge => edge.node));

    hasNextPage = res.data[name].pageInfo.hasNextPage;
    after = res.data[name].pageInfo.endCursor;
  }

  return allItems;
}

export default async function handler(req, res) {
  try {
    // Optional secret for manual triggers
    if (req.query.secret && req.query.secret !== process.env.MANUAL_CRAWL_SECRET) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    // Crawl products, collections, pages
    const [products, collections, pages] = await Promise.all([
      crawlAll(PRODUCTS_QUERY, "products"),
      crawlAll(COLLECTIONS_QUERY, "collections"),
      crawlAll(PAGES_QUERY, "pages"),
    ]);

    const crawlData = {
      timestamp: new Date().toISOString(),
      products,
      collections,
      pages,
    };

    // Save to JSON
    fs.writeFileSync(DATA_FILE, JSON.stringify(crawlData, null, 2));

    res.status(200).json({ status: "success", message: "Crawl complete", data: crawlData });
  } catch (err) {
    console.error("Progressive crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
