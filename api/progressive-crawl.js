// api/progressive-crawl.js
import fetch from "node-fetch"; // Only if you need, otherwise Vercel Edge can use native fetch

export default async function handler(req, res) {
  const SECRET = "mySuperSecret123!"; // your manual trigger secret
  const STORE_URL = "http://51294e-8f.myshopify.com";

  // Simple auth for manual trigger
  if (req.query.secret && req.query.secret !== SECRET) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  try {
    // --- Example: Crawl Products ---
    const productsRes = await fetch(`${STORE_URL}/products.json?limit=250`);
    const productsData = await productsRes.json();

    // --- Example: Crawl Collections ---
    const collectionsRes = await fetch(`${STORE_URL}/collections.json?limit=250`);
    const collectionsData = await collectionsRes.json();

    // --- Example: Crawl Pages ---
    const pagesRes = await fetch(`${STORE_URL}/pages.json?limit=250`);
    const pagesData = await pagesRes.json();

    // You can add more endpoints here if needed

    // --- Combine all crawled data ---
    const siteData = {
      products: productsData.products || [],
      collections: collectionsData.collections || [],
      pages: pagesData.pages || [],
      crawledAt: new Date().toISOString(),
    };

    // --- Optionally: Save to DB, cache, or just log ---
    console.log("Progressive crawl completed:", siteData);

    return res.status(200).json({ status: "success", crawledItems: siteData });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    return res.status(500).json({ status: "error", message: "Crawl failed", error: err.message });
  }
}
