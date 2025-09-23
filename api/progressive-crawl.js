// api/progressive-crawl.js
import fs from "fs";
import path from "path";

const STORE_DOMAIN = "51294e-8f.myshopify.com";
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2025-10";

// Directory to store data
const DATA_DIR = path.resolve("./data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Load or initialize last crawl timestamps
function loadTimestamps() {
  const file = path.join(DATA_DIR, "timestamps.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveTimestamps(timestamps) {
  const file = path.join(DATA_DIR, "timestamps.json");
  fs.writeFileSync(file, JSON.stringify(timestamps, null, 2));
}

// Save resource data
function saveResourceData(resource, items) {
  const file = path.join(DATA_DIR, `${resource}.json`);
  let existing = [];
  if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file, "utf8"));

  // Replace or append updated items
  const updated = [...existing.filter(e => !items.find(i => i.id === e.id)), ...items];
  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
}

// Fetch resources incrementally
async function fetchResource(resource, updatedSince) {
  let allItems = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const url = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/${resource}.json?limit=${limit}&page=${page}` +
      (updatedSince ? `&updated_at_min=${updatedSince}` : "");

    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": ACCESS_TOKEN }
    });

    if (!res.ok) throw new Error(`Failed to fetch ${resource}: ${res.statusText}`);
    const data = await res.json();

    const items = data[resource] || [];
    if (items.length === 0) break;

    allItems.push(...items);
    if (items.length < limit) break;
    page++;
  }

  return allItems;
}

// Main handler
export default async function handler(req, res) {
  try {
    const timestamps = loadTimestamps();
    const resources = ["products", "collections", "pages"];

    for (const resource of resources) {
      const updatedSince = timestamps[resource] || null;
      const items = await fetchResource(resource, updatedSince);

      if (items.length > 0) {
        saveResourceData(resource, items);
        timestamps[resource] = new Date().toISOString();
      }
    }

    saveTimestamps(timestamps);

    res.status(200).json({ status: "success", timestamps });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
