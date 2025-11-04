import fetch from "node-fetch";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const GITHUB_REPO = process.env.GITHUB_REPO; // e.g., username/repo
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // personal access token

const CHUNK_SIZE = 50; // items per API call

async function fetchShopify(resource, cursor = null) {
  let url = `https://${SHOPIFY_DOMAIN}/api/2023-10/${resource}.json?limit=${CHUNK_SIZE}`;
  if (cursor) url += `&page_info=${cursor}`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`[Shopify] Failed to fetch ${resource}: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function pushToGitHub(filename, content) {
  const path = `crawl/${filename}`;
  const base64Content = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Update ${filename} - ${new Date().toISOString()}`,
      content: base64Content,
    }),
  });

  if (!res.ok) {
    throw new Error(`[GitHub] Failed to push ${filename}: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function crawlResource(resource) {
  let allItems = [];
  let cursor = null;
  let page = 1;

  do {
    const data = await fetchShopify(resource, cursor);
    const items = data[resource] || [];
    allItems.push(...items);

    // check for pagination (Shopify REST may not give cursor, adjust if needed)
    cursor = data.next_page_info || null;
    page++;
  } while (cursor);

  return allItems;
}

export default async function handler(req, res) {
  try {
    const products = await crawlResource("products");
    const collections = await crawlResource("collections");
    const pages = await crawlResource("pages");

    // push individually to GitHub
    await pushToGitHub("products.json", products);
    await pushToGitHub("collections.json", collections);
    await pushToGitHub("pages.json", pages);

    res.status(200).json({
      status: "success",
      counts: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
