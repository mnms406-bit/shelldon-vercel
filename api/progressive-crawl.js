// api/progressive-crawl.js
import fs from "fs";
import path from "path";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // e.g., 51294e-8f.myshopify.com
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY;
const CHUNK_SIZE = 50; // products per request

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": ADMIN_API_TOKEN,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchProducts() {
  let products = [];
  let page = 1;
  while (true) {
    const url = `https://${STORE_DOMAIN}/admin/api/2023-10/products.json?limit=${CHUNK_SIZE}&page=${page}`;
    const data = await fetchJSON(url);
    if (!data.products || data.products.length === 0) break;
    products.push(...data.products);
    page++;
  }
  return products;
}

async function fetchCollections() {
  const url = `https://${STORE_DOMAIN}/admin/api/2023-10/collections.json`;
  const data = await fetchJSON(url);
  return data.custom_collections || [];
}

async function fetchPages() {
  const url = `https://${STORE_DOMAIN}/admin/api/2023-10/pages.json`;
  const data = await fetchJSON(url);
  return data.pages || [];
}

export default async function handler(req, res) {
  try {
    const crawlData = {
      timestamp: new Date().toISOString(),
      products: await fetchProducts(),
      collections: await fetchCollections(),
      pages: await fetchPages(),
    };

    // Save locally in /tmp (Vercel allows this)
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    res.status(200).json({
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
    res.status(500).json({
      status: "error",
      message: "Crawl failed",
      details: err.message,
    });
  }
}
