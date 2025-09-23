// api/progressive-crawl.js
import fs from "fs";
import path from "path";

const STORE_URL = "http://51294e-8f.myshopify.com";
const ADMIN_API_VERSION = "2023-10"; // match your store's API version
const API_KEY = process.env.SHOPIFY_ADMIN_API_KEY;
const PASSWORD = process.env.SHOPIFY_ADMIN_API_PASSWORD;

const RESOURCES = [
  { name: "products", endpoint: `/admin/api/${ADMIN_API_VERSION}/products.json` },
  { name: "collections", endpoint: `/admin/api/${ADMIN_API_VERSION}/collections.json` },
  { name: "pages", endpoint: `/admin/api/${ADMIN_API_VERSION}/pages.json` }
];

const PROGRESS_FILE = path.resolve("./progress.json");
const OUTPUT_DIR = path.resolve("./crawl-data");

export default async function handler(req, res) {
  // Allow frontend CORS
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  }

  try {
    for (const resource of RESOURCES) {
      const lastPage = progress[resource.name]?.page || 1;
      const limit = 50; // Shopify pagination limit
      const url = `${STORE_URL}${resource.endpoint}?limit=${limit}&page=${lastPage}`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Basic ${Buffer.from(`${API_KEY}:${PASSWORD}`).toString("base64")}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        console.error(`${resource.name} fetch failed:`, response.statusText);
        continue;
      }

      const data = await response.json();
      const items = data[resource.name] || [];

      // Write to file with timestamp
      const timestamp = new Date().toISOString();
      const filePath = path.join(OUTPUT_DIR, `${resource.name}_page${lastPage}.json`);
      fs.writeFileSync(filePath, JSON.stringify({ timestamp, items }, null, 2));

      // Update progress
      progress[resource.name] = {
        page: lastPage + 1,
        lastRun: timestamp,
        finished: items.length < limit // If fewer than limit, this resource finished
      };
    }

    // Save progress
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

    res.status(200).json({ status: "success", progress });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ status: "error", message: "Crawl failed.", error: err.message });
  }
}
