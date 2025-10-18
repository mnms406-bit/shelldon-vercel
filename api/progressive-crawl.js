import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // e.g., "51294e-8f.myshopify.com"
const API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY; // your public Storefront API key
const JSON_PATH = path.join("/tmp", "crawl-data.json");
const CHUNK_SIZE = 50; // items per chunk

export default async function handler(req, res) {
  try {
    // Load previous crawl data
    let crawlData = {};
    if (fs.existsSync(JSON_PATH)) {
      crawlData = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    } else {
      crawlData = { products: [], collections: [], pages: {} };
    }

    // Determine which resource to crawl this run
    const resourceOrder = ["products", "collections", "pages"];
    let resource = resourceOrder.find(r => (crawlData[r]?.lastIndex || 0) < (crawlData[r]?.total || Infinity));
    if (!resource) resource = "products"; // start with products if all done

    // Fetch next chunk
    let url;
    let lastIndex = crawlData[resource]?.lastIndex || 0;
    if (resource === "products") {
      url = `https://${STORE_DOMAIN}/api/2023-07/products.json?limit=${CHUNK_SIZE}&page=${Math.floor(lastIndex/CHUNK_SIZE)+1}`;
    } else if (resource === "collections") {
      url = `https://${STORE_DOMAIN}/api/2023-07/collections.json?limit=${CHUNK_SIZE}&page=${Math.floor(lastIndex/CHUNK_SIZE)+1}`;
    } else if (resource === "pages") {
      url = `https://${STORE_DOMAIN}/api/2023-07/pages.json?limit=${CHUNK_SIZE}&page=${Math.floor(lastIndex/CHUNK_SIZE)+1}`;
    }

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Storefront-Access-Token": API_KEY,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch ${resource} (status ${response.status})`);

    const data = await response.json();
    const items = data[resource] || [];

    // Merge items into crawlData
    crawlData[resource] = crawlData[resource] || { lastIndex: 0, items: [] };
    crawlData[resource].items = [...crawlData[resource].items, ...items];
    crawlData[resource].lastIndex = lastIndex + items.length;
    crawlData[resource].total = data[`${resource}_count`] || crawlData[resource].lastIndex;

    // Save crawl data
    fs.writeFileSync(JSON_PATH, JSON.stringify(crawlData, null, 2));

    res.status(200).json({ status: "success", resource, fetched: items.length, lastIndex: crawlData[resource].lastIndex });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
