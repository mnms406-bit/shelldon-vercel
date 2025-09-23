// api/progressive-crawl.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE; // e.g., 51294e-8f.myshopify.com
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_PASSWORD = process.env.SHOPIFY_PASSWORD;
const CHUNK_SIZE = 50; // number of items per fetch

// Utility function to fetch Shopify resources with pagination
async function fetchShopifyResource(resource, pageInfo = null) {
  let url = `https://${SHOPIFY_API_KEY}:${SHOPIFY_PASSWORD}@${SHOPIFY_STORE}/admin/api/2025-10/${resource}.json?limit=${CHUNK_SIZE}`;
  if (pageInfo) url += `&page_info=${pageInfo}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${resource}: ${res.status}`);
  const data = await res.json();
  return data[resource];
}

// Main crawl handler
export default async function handler(req, res) {
  // Simple secret to manually trigger
  const secret = req.query.secret;
  if (secret !== process.env.CRAWL_SECRET) {
    return res.status(401).json({ reply: "Unauthorized" });
  }

  try {
    const siteData = {};

    // Resources to crawl
    const resources = ["products", "pages", "custom_collections", "smart_collections", "blogs", "articles"];

    for (const resource of resources) {
      let allItems = [];
      let pageInfo = null;

      do {
        const items = await fetchShopifyResource(resource, pageInfo);
        allItems = allItems.concat(items);

        // For simplicity, we stop when less than CHUNK_SIZE returned
        if (items.length < CHUNK_SIZE) break;

        // Here you could use Shopify Link headers for pagination if needed
        pageInfo = null; // replace with actual next_page_info if implementing cursor pagination
      } while (true);

      siteData[resource] = allItems;
    }

    // Add timestamp
    siteData.timestamp = new Date().toISOString();

    // Save JSON file
    const filePath = path.join(process.cwd(), "shopify-site-data.json");
    fs.writeFileSync(filePath, JSON.stringify(siteData, null, 2));

    res.status(200).json({ reply: `Shopify crawl completed. ${resources.length} resources saved.` });
  } catch (err) {
    console.error("Crawl error:", err);
    res.status(500).json({ reply: "Crawl failed. Check server logs." });
  }
}
