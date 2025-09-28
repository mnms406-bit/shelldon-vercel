export default async function handler(req, res) {
  try {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. myshop.myshopify.com
    const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    async function shopifyQuery(query) {
      const response = await fetch(`https://${storeDomain}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": accessToken,
        },
        body: JSON.stringify({ query })
      });
      return response.json();
    }

    // Queries
    const productsQuery = `
      { products(first: 50) { edges { node { id title description handle } } } }
    `;
    const collectionsQuery = `
      { collections(first: 50) { edges { node { id title description handle } } } }
    `;
    const pagesQuery = `
      { pages(first: 50) { edges { node { id title body handle } } } }
    `;

    // Fetch
    const [products, collections, pages] = await Promise.all([
      shopifyQuery(productsQuery),
      shopifyQuery(collectionsQuery),
      shopifyQuery(pagesQuery),
    ]);

    // Prepare crawl data
    const crawlData = {
      timestamp: new Date().toISOString(),
      products,
      collections,
      pages
    };

    // Save file into Vercel’s build cache (publicly available)
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join("/tmp", "crawl-data.json"); 
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    res.status(200).json({ status: "success", file: "/api/get-crawl" });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
