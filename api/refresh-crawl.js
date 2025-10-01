// api/refresh-crawl.js
import fs from "fs";
import path from "path";

// Where crawl data will be saved (under Vercel's /tmp directory at runtime)
const DATA_FILE = path.join("/tmp", "crawl-data.json");

export default async function handler(req, res) {
  try {
    // Only allow POST requests (manual refresh)
    if (req.method !== "POST") {
      return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    // Make sure your Storefront token + domain exist
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. "51294e-8f.myshopify.com"
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!shopDomain || !storefrontToken) {
      return res.status(500).json({
        status: "error",
        message: "Missing Shopify credentials in environment variables."
      });
    }

    // GraphQL query: products, collections, and pages
    const query = `
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              description
              handle
            }
          }
        }
        collections(first: 50) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
        pages(first: 50) {
          edges {
            node {
              id
              title
              handle
              body
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shopDomain}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    if (!result.data) {
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch from Shopify",
        details: result
      });
    }

    // Build crawl object with timestamp
    const crawlData = {
      timestamp: new Date().toISOString(),
      data: result.data
    };

    // Save to temp (in prod, you’d want persistent storage like S3, Supabase, etc.)
    fs.writeFileSync(DATA_FILE, JSON.stringify(crawlData, null, 2));

    return res.status(200).json({
      status: "success",
      message: "Crawl refreshed",
      data: crawlData
    });

  } catch (err) {
    console.error("Refresh crawl error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to refresh crawl.",
      details: err.message
    });
  }
}
