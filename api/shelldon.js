import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Base domain from your env var
    const shop = process.env.SHOPIFY_STORE_DOMAIN; 

    // Try main pages sitemap (always exists)
    let sitemapUrl = `https://${shop}/sitemap_pages.xml`;

    let response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    let xml = await response.text();

    // Quick check: if it’s empty or doesn’t include <url>, fallback
    if (!xml.includes("<url>")) {
      // Try the product sitemap as backup
      sitemapUrl = `https://${shop}/sitemap_products_1.xml`;
      response = await fetch(sitemapUrl);
      if (!response.ok) {
        throw new Error(`Fallback failed: ${response.status}`);
      }
      xml = await response.text();
    }

    // At this point xml should have sitemap data
    res.status(200).json({
      reply: "Fetched products from Shopify successfully!",
      sitemapSample: xml.substring(0, 500) // show first 500 chars
    });
  } catch (error) {
    console.error("Error fetching products from Shopify:", error);
    res.status(500).json({ reply: "Error fetching products from Shopify." });
  }
}
