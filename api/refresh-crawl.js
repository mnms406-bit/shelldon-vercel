import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_KEY;

// You can tweak these chunk sizes
const PRODUCT_CHUNK = 20;
const COLLECTION_CHUNK = 5;
const PAGE_CHUNK = 5;

export default async function handler(req, res) {
  try {
    if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
      return res.status(400).json({ error: "Missing Shopify env variables." });
    }

    let crawlData = { products: [], collections: [], pages: [], timestamp: new Date().toISOString() };

    // --- PRODUCTS ---
    let cursor = null;
    do {
      const query = `
      {
        products(first: ${PRODUCT_CHUNK}${cursor ? `, after: "${cursor}"` : ""}) {
          edges {
            cursor
            node {
              id
              title
              handle
              description
              variants {
                id
                title
                price { amount, currencyCode }
              }
            }
          }
        }
      }`;

      const resp = await fetch(`https://${SHOP_DOMAIN}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();
      const edges = data.data.products.edges;
      edges.forEach(edge => crawlData.products.push(edge.node));
      cursor = edges.length ? edges[edges.length - 1].cursor : null;
    } while (cursor);

    // --- COLLECTIONS ---
    let collectionCursor = null;
    do {
      const query = `
      {
        collections(first: ${COLLECTION_CHUNK}${collectionCursor ? `, after: "${collectionCursor}"` : ""}) {
          edges {
            cursor
            node { id title handle }
          }
        }
      }`;
      const resp = await fetch(`https://${SHOP_DOMAIN}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();
      const edges = data.data.collections.edges;
      edges.forEach(edge => crawlData.collections.push(edge.node));
      collectionCursor = edges.length ? edges[edges.length - 1].cursor : null;
    } while (collectionCursor);

    // --- PAGES ---
    let pageCursor = null;
    do {
      const query = `
      {
        pages(first: ${PAGE_CHUNK}${pageCursor ? `, after: "${pageCursor}"` : ""}) {
          edges {
            cursor
            node { id title handle body }
          }
        }
      }`;
      const resp = await fetch(`https://${SHOP_DOMAIN}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();
      const edges = data.data.pages.edges;
      edges.forEach(edge => crawlData.pages.push(edge.node));
      pageCursor = edges.length ? edges[edges.length - 1].cursor : null;
    } while (pageCursor);

    // --- Save to temporary file ---
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    res.status(200).json({
      status: "success",
      message: "Crawl completed",
      counts: {
        products: crawlData.products.length,
        collections: crawlData.collections.length,
        pages: crawlData.pages.length,
      },
      file: filePath,
    });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
