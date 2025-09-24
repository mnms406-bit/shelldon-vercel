// /api/crawl-pages.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SHOP = '51294e-8f.myshopify.com';
  const TOKEN = process.env.SHOPIFY_ADMIN_API_KEY;
  const LIMIT = 20;
  const page = parseInt(req.query.page || '1', 10);

  try {
    const url = `https://${SHOP}/admin/api/2023-10/pages.json?limit=${LIMIT}&page=${page}`;
    const response = await fetch(url, { headers: { 'X-Shopify-Access-Token': TOKEN } });
    const data = await response.json();

    const timestamp = new Date().toISOString();
    data.pages = data.pages.map(p => ({ ...p, _lastFetched: timestamp }));

    res.status(200).json({ page, timestamp, pages: data.pages, hasMore: data.pages.length === LIMIT });
  } catch (err) {
    console.error('Pages crawl error:', err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
}

