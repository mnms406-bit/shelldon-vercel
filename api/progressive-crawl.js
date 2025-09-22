// /api/progressive-crawl.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Only allow GET (cron job) or manual trigger
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const SHOPIFY_STORE = 'http://51294e-8f.myshopify.com';
    const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY;

    // Helper to fetch from Shopify Admin API
    const fetchShopify = async (resource) => {
      const response = await fetch(`${SHOPIFY_STORE}/admin/api/2025-10/${resource}.json`, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      return response.json();
    };

    // Fetch products, collections, pages
    const [productsRes, collectionsRes, pagesRes] = await Promise.all([
      fetchShopify('products?limit=250'),
      fetchShopify('custom_collections?limit=250'),
      fetchShopify('pages?limit=250')
    ]);

    const siteData = {
      products: productsRes.products || [],
      collections: collectionsRes.custom_collections || [],
      pages: pagesRes.pages || [],
      lastCrawl: new Date().toISOString()
    };

    // Store JSON in a file inside the serverless function (temporary in Vercel)
    // Better: use a DB like Firebase or Supabase for persistent storage
    const filePath = path.join('/tmp', 'siteData.json');
    fs.writeFileSync(filePath, JSON.stringify(siteData, null, 2));

    console.log(`Crawl complete: ${siteData.products.length} products, ${siteData.collections.length} collections, ${siteData.pages.length} pages.`);

    res.status(200).json({ message: 'Crawl complete', counts: { products: siteData.products.length, collections: siteData.collections.length, pages: siteData.pages.length } });
  } catch (err) {
    console.error('Progressive crawl error:', err);
    res.status(500).json({ message: 'Crawl failed', error: err.message });
  }
}

