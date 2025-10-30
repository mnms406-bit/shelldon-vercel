import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;
const API_VERSION = "2023-04"; // ✅ older compatible version

export default async function handler(req, res) {
  try {
    console.log("🕷️ Starting DEBUG crawl...");

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      throw new Error("Missing Shopify domain or Storefront API key in environment variables.");
    }

    // 1️⃣ Test Shopify connection
    const testQuery = `{ shop { name myshopifyDomain } }`;
    const testRes = await shopifyFetch(testQuery);
    const testData = await testRes.json();

    if (!testData.data) {
      console.error("Shopify connection failed:", testData);
      throw new Error("Shopify Storefront API connection failed");
    }

    const crawledData = {
      timestamp: new Date().toISOString(),
      shop: testData.data.shop,
      products: [],
      collections: [],
      pages: [],
    };

    // 2️⃣ Products (very small limit)
    const productQuery = `
      {
        products(first: 2) {
          edges {
            node { id title handle updatedAt }
          }
        }
      }
    `;
    const prodRes = await shopifyFetch(productQuery);
    const prodData = await prodRes.json();
    crawledData.products = prodData.data?.products?.edges?.map(e => e.node) || [];

    // 3️⃣ Collections (small limit)
    const collectionQuery = `
      {
        collections(first: 2) {
          edges {
            node { id title handle updatedAt }
          }
        }
      }
    `;
    const colRes = await shopifyFetch(collectionQuery);
    const colData = await colRes.json();
    crawledData.collections = colData.data?.collections?.edges?.map(e => e.node) || [];

    // 4️⃣ Pages (small limit)
    const pageQuery = `
      {
        pages(first: 2) {
          edges {
            node { id title handle updatedAt }
          }
        }
      }
    `;
    const pageRes = await shopifyFetch(pageQuery);
    const pageData = await pageRes.json();
    crawledData.pages = pageData.data?.pages?.edges?.map(e => e.node) || [];

    // 5️⃣ Save crawl data to /tmp
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawledData, null, 2));

    console.log("✅ Crawl complete:", crawledData);
    res.status(200).json({ status: "success", file: filePath, sample: crawledData });
  } catch (err) {
    console.error("❌ Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}

async function shopifyFetch(query) {
  return fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
    },
    body: JSON.stringify({ query }),
  });
}
