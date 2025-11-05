// api/refresh-crawl.js
import fs from "fs";
import path from "path";

let latestCrawl = null; // shared in-memory fallback

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ status: "error", message: "Only GET allowed" });
    }

    const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
    const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      return res.status(400).json({ status: "error", message: "Missing SHOPIFY env vars" });
    }

    const queries = {
      products: `{
        products(first:50) {
          edges { node { id title handle description onlineStoreUrl } }
        }
      }`,
      collections: `{
        collections(first:50) {
          edges { node { id title handle } }
        }
      }`,
      pages: `{
        pages(first:50) {
          edges { node { id title handle body } }
        }
      }`
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      const resp = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
        },
        body: JSON.stringify({ query }),
      });

      const body = await resp.json();
      results[key] = body.data?.[key]?.edges?.map(e => e.node) || [];
    }

    const crawlData = {
      timestamp: new Date().toISOString(),
      counts: {
        products: results.products.length,
        collections: results.collections.length,
        pages: results.pages.length,
      },
      results
    };

    // Save to /tmp (ephemeral)
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2), "utf8");

    // Save to live in-memory cache
    latestCrawl = crawlData;

    return res.status(200).json({
      status: "success",
      message: "Crawl completed successfully",
      ...crawlData
    });
  } catch (err) {
    console.error("refresh-crawl error:", err);
    return res.status(500).json({ status: "error", message: "Crawl failed", details: String(err) });
  }
}

export { latestCrawl };
