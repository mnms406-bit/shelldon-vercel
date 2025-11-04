import fetch from "node-fetch";

// Environment variables
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal access token
const GITHUB_REPO = process.env.GITHUB_REPO;   // example: "username/repo"
const GITHUB_PATH = process.env.GITHUB_PATH || "crawl-data.json"; // file path in repo

export default async function handler(req, res) {
  try {
    if (!SHOPIFY_STORE || !SHOPIFY_STOREFRONT_API_KEY || !GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ status: "error", message: "Missing env vars" });
    }

    // Crawl Shopify
    const endpoints = ["/products.json", "/collections.json", "/pages.json"];
    const results = {};

    for (const endpoint of endpoints) {
      const url = `https://${SHOPIFY_STORE}/api/2023-01${endpoint}?limit=250`;
      const response = await fetch(url, {
        headers: {
          "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch ${endpoint}: ${text}`);
      }
      const data = await response.json();
      results[endpoint.replace(".json", "")] = data;
    }

    // Push to GitHub
    const content = Buffer.from(JSON.stringify(results, null, 2)).toString("base64");

    // Check if file exists to get SHA
    let sha;
    const getResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
    });
    if (getResp.ok) {
      const getData = await getResp.json();
      sha = getData.sha;
    }

    const commitResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      method: "PUT",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
      body: JSON.stringify({
        message: "Update crawl data",
        content,
        sha,
      }),
    });

    if (!commitResp.ok) {
      const text = await commitResp.text();
      throw new Error(`GitHub push failed: ${text}`);
    }

    res.status(200).json({ status: "success", message: "Crawl completed and saved to GitHub" });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
