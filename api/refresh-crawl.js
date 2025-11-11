import fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const GITHUB_REPO = "mnms406-bit/shelldon-vercel"; // your GitHub repo
const FILE_PATH = "crawl-data.json"; // file in repo to save crawl
const CHUNK_SIZE = 50; // number of items per fetch

export default async function handler(req, res) {
  if (!SHOP_DOMAIN || !STOREFRONT_TOKEN || !GITHUB_TOKEN) {
    return res.status(400).json({
      status: "error",
      message: "Missing environment variables",
    });
  }

  try {
    const results = { products: [], collections: [], pages: [] };

    // Helper: fetch JSON from Shopify Storefront
    async function fetchShopify(endpoint, chunk = 1) {
      try {
        const url = `https://${SHOP_DOMAIN}/api/2023-07/${endpoint}.json?limit=${CHUNK_SIZE}&page=${chunk}`;
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          console.error(`Error fetching ${endpoint}: ${response.status}`);
          return [];
        }
        const data = await response.json();
        return data[endpoint] || [];
      } catch (err) {
        console.error(`Fetch error ${endpoint}:`, err);
        return [];
      }
    }

    // Fetch all items in chunks
    async function fetchAll(endpoint) {
      let page = 1;
      let all = [];
      while (true) {
        const chunk = await fetchShopify(endpoint, page);
        if (chunk.length === 0) break;
        all = all.concat(chunk);
        page++;
      }
      return all;
    }

    results.products = await fetchAll("products");
    results.collections = await fetchAll("collections");
    results.pages = await fetchAll("pages");

    // Save results to GitHub
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // Get current file SHA (if exists)
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner: "mnms406-bit",
        repo: "shelldon-vercel",
        path: FILE_PATH,
      });
      sha = data.sha;
    } catch (err) {
      console.log("File does not exist yet, will create new.");
    }

    const content = Buffer.from(JSON.stringify(results, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: "mnms406-bit",
      repo: "shelldon-vercel",
      path: FILE_PATH,
      message: `Updated crawl at ${new Date().toISOString()}`,
      content,
      sha,
    });

    res.status(200).json({ status: "success", counts: {
      products: results.products.length,
      collections: results.collections.length,
      pages: results.pages.length,
    }, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: "Refresh crawl failed", details: err.message });
  }
}
