
// /api/crawl-products.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SHOP = '51294e-8f.myshopify.com';
  const TOKEN = process.env.SHOPIFY_ADMIN_API_KEY; // Use private app or access token
  const LIMIT = 20; // chunk size
  const page = parseInt(req.query.page || '1', 10);

  try {
    const url = `https://${SHOP}/admin/api/2023-10/products.json?limit=${LIMIT}&page=${page}`;
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': TOKEN }
    });
    const data = await response.json();

    // Add timestamp for this batch
    const timestamp = new Date().toISOString();
    data.products = data.products.map(p => ({ ...p, _lastFetched: timestamp }));

    res.status(200).json({ page, timestamp, products: data.products, hasMore: data.products.length === LIMIT });
  } catch (err) {
    console.error('Products crawl error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}
