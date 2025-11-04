// api/refresh-crawl.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ status: "error", message: "Only GET allowed" });
    }

    const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // e.g. 51294e-8f.myshopify.com
    const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      return res.status(400).json({ status: "error", message: "Missing SHOPIFY env vars" });
    }

    // GraphQL queries (small, safe)
    const queries = {
      products: `{
        products(first:50) {
          edges {
            node {
              id
              title
              handle
              description
              onlineStoreUrl
            }
          }
        }
      }`,
      collections: `{
        collections(first:50) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }`,
      pages: `{
        pages(first:50) {
          edges {
            node {
              id
              title
              handle
              body
            }
          }
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

      // if Shopify returns non-OK, capture detailed error text
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`Shopify ${key} fetch failed:`, resp.status, txt);
        results[key] = { error: `Shopify fetch failed ${resp.status}`, detail: txt };
        continue; // move on to next query
      }

      const body = await resp.json();
      if (body.errors) {
        console.error(`Shopify ${key} returned errors:`, body.errors);
      }
      results[key] = body.data?.[key]?.edges?.map(e => e.node) || [];
    }

    // Save to /tmp (temporary — for immediate get-crawl reads)
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2), "utf8");

    return res.status(200).json({
      status: "success",
      message: "Crawl completed and saved to /tmp",
      counts: {
        products: Array.isArray(results.products) ? results.products.length : 0,
        collections: Array.isArray(results.collections) ? results.collections.length : 0,
        pages: Array.isArray(results.pages) ? results.pages.length : 0,
      },
      timestamp: new Date().toISOString(),
      file: filePath
    });
  } catch (err) {
    console.error("refresh-crawl crashed:", err);
    return res.status(500).json({ status: "error", message: "Crawl failed", details: String(err) });
  }
}
