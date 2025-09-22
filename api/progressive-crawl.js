// api/progressive-crawl.js

import fetch from "node-fetch"; // Only needed in Vercel Node.js environment

// Replace with your Shopify store domain and Storefront Access Token
const SHOPIFY_DOMAIN = "51294e-8f.myshopify.com";
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// Function to fetch Shopify data
async function fetchShopifyData() {
  const query = `
    {
      products(first: 100) { edges { node { title description tags } } }
      collections(first: 50) { edges { node { title description } } }
      pages(first: 50) { edges { node { title body } } }
    }
  `;

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  const siteContent = [];

  if (data.data.products) {
    data.data.products.edges.forEach(edge => {
      siteContent.push({
        type: "product",
        title: edge.node.title,
        description: edge.node.description
      });
    });
  }

  if (data.data.collections) {
    data.data.collections.edges.forEach(edge => {
      siteContent.push({
        type: "collection",
        title: edge.node.title,
        description: edge.node.description
      });
    });
  }

  if (data.data.pages) {
    data.data.pages.edges.forEach(edge => {
      siteContent.push({
        type: "page",
        title: edge.node.title,
        description: edge.node.body
      });
    });
  }

  return siteContent;
}

// Save or update your AI “brain” storage
async function updateBrain(siteContent) {
  // For simplicity, we store in-memory for now.
  // You can replace with a database or file storage for persistence.
  global.shelldonBrain = siteContent;
}

// Main handler
export default async function handler(req, res) {
  try {
    const siteContent = await fetchShopifyData();
    await updateBrain(siteContent);
    console.log("Shelldon brain updated:", siteContent.length, "items");
    res.status(200).json({ status: "Crawler ran successfully", items: siteContent.length });
  } catch (err) {
    console.error("Progressive crawl failed:", err);
    res.status(500).json({ error: "Crawler failed", details: err.message });
  }
}
