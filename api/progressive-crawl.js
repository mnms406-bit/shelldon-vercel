import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // Only needed for older Node; in newer Node you can use global fetch

const SHOPIFY_STORE = "http://51294e-8f.myshopify.com"; // Your Shopify domain
const CHUNK_SIZE = 10; // Number of pages/products per chunk

// Mock function to get all site URLs: products, collections, pages
async function getAllUrls() {
  const urls = [];

  // Products
  const productsRes = await fetch(`${SHOPIFY_STORE}/products.json`);
  const productsData = await productsRes.json();
  productsData.products.forEach(p => urls.push(`/products/${p.handle}`));

  // Collections
  const collectionsRes = await fetch(`${SHOPIFY_STORE}/collections.json`);
  const collectionsData = await collectionsRes.json();
  collectionsData.collections.forEach(c => urls.push(`/collections/${c.handle}`));

  // Pages
  const pagesRes = await fetch(`${SHOPIFY_STORE}/pages.json`);
  const pagesData = await pagesRes.json();
  pagesData.pages.forEach(p => urls.push(`/pages/${p.handle}`));

  return urls;
}

// Crawl a single URL and return content
async function crawlUrl(url) {
  try {
    const res = await fetch(`${SHOPIFY_STORE}${url}`);
    const html = await res.text();
    return { url, content: html };
  } catch (err) {
    console.error("Error crawling URL:", url, err);
    return { url, content: "" };
  }
}

export default async function handler(req, res) {
  // CORS headers for your frontend
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const urls = await getAllUrls();
    const result = [];
    
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(crawlUrl));
      result.push(...chunkResults);
    }

    const output = {
      lastCrawled: new Date().toISOString(),
      data: result
    };

    // Write JSON to disk
    const filePath = path.resolve("./shelldon-brain.json");
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

    res.status(200).json({ message: "Crawl completed", total: result.length });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ message: "Crawl failed" });
  }
}
