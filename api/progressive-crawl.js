export default async function handler(req, res) {
  // Only allow frontend origin
  const FRONTEND_ORIGIN = "https://enajif.com";
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const SHOPIFY_STORE = "http://51294e-8f.myshopify.com";
  const CHUNK_SIZE = 5; // smaller chunk to avoid timeout

  try {
    // Example: get products
    const productsRes = await fetch(`${SHOPIFY_STORE}/products.json`);
    const products = (await productsRes.json()).products || [];

    // Example: get collections
    const collectionsRes = await fetch(`${SHOPIFY_STORE}/collections.json`);
    const collections = (await collectionsRes.json()).collections || [];

    // Example: get pages
    const pagesRes = await fetch(`${SHOPIFY_STORE}/pages.json`);
    const pages = (await pagesRes.json()).pages || [];

    // Combine URLs
    const urls = [
      ...products.map(p => `/products/${p.handle}`),
      ...collections.map(c => `/collections/${c.handle}`),
      ...pages.map(p => `/pages/${p.handle}`)
    ];

    const result = [];

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (url) => {
          try {
            const r = await fetch(`${SHOPIFY_STORE}${url}`);
            const html = await r.text();
            return { url, content: html };
          } catch {
            return { url, content: "" };
          }
        })
      );
      result.push(...chunkResults);
    }

    // Save to /tmp (serverless writable path)
    const filePath = "/tmp/shelldon-brain.json";
    await fs.promises.writeFile(filePath, JSON.stringify({
      lastCrawled: new Date().toISOString(),
      data: result
    }, null, 2));

    res.status(200).json({ message: "Crawl completed", total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Crawl failed" });
  }
}
