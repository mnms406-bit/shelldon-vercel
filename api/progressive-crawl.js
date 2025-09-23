// api/progressive-crawl.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_PASSWORD = process.env.SHOPIFY_PASSWORD;
const CHUNK_SIZE = 25; // small enough to avoid timeout

const CURSOR_FILE = path.join(process.cwd(), "crawl-cursor.json");
const DATA_FILE = path.join(process.cwd(), "shopify-site-data.json");

// Load cursor state
function loadCursor() {
  if (fs.existsSync(CURSOR_FILE)) return JSON.parse(fs.readFileSync(CURSOR_FILE, "utf-8"));
  return {};
}

// Save cursor state
function saveCursor(cursor) {
  fs.writeFileSync(CURSOR_FILE, JSON.stringify(cursor, null, 2));
}

// Save site data
function saveData(data) {
  data.timestamp = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Fetch Shopify resource
async function fetchShopify(resource, page = 1) {
  const url = `https://${SHOPIFY_API_KEY}:${SHOPIFY_PASSWORD}@${SHOPIFY_STORE}/admin/api/2025-10/${resource}.json?limit=${CHUNK_SIZE}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${resource} page ${page}: ${res.status}`);
  const json = await res.json();
  return json[resource];
}

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRAWL_SECRET) return res.status(401).json({ reply: "Unauthorized" });

  try {
    const resources = ["products", "pages", "custom_collections", "smart_collections", "blogs", "articles"];
    const cursor = loadCursor();
    const siteData = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) : {};

    for (const resource of resources) {
      const currentPage = cursor[resource] || 1;
      const items = await fetchShopify(resource, currentPage);

      siteData[resource] = siteData[resource] ? siteData[resource].concat(items) : items;

      if (items.length < CHUNK_SIZE) {
        cursor[resource] = 1; // finished this resource, reset to start next run
      } else {
        cursor[resource] = currentPage + 1; // continue next run
      }
    }

    saveCursor(cursor);
    saveData(siteData);

    res.status(200).json({ reply: "Chunked crawl completed successfully." });
  } catch (err) {
    console.error("Crawl error:", err);
    res.status(500).json({ reply: "Crawl failed. Check server logs." });
  }
}
