import fetch from "node-fetch";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

    if (!shopDomain || !storefrontToken) {
      return res.status(400).json({
        status: "error",
        message: "Missing Shopify environment variables.",
      });
    }

    const shopUrl = `https://${shopDomain}/api/2023-07/graphql.json`;

    const query = `
      {
        products(first: 100) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 5) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }
        collections(first: 20) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
        pages(first: 10) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const response = await fetch(shopUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error: ${text}`);
    }

    const data = await response.json();

    // Save crawl data to temporary file
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    return res.status(200).json({
      status: "success",
      message: "Crawl completed successfully",
      counts: {
        products: data.data.products.edges.length,
        collections: data.data.collections.edges.length,
        pages: data.data.pages.edges.length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({
      status: "error",
      message: "Crawl failed",
      details: err.message,
    });
  }
}
