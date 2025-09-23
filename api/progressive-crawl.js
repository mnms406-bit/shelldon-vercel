export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== process.env.CRAWL_SECRET) {
    return new Response(JSON.stringify({ reply: "Unauthorized" }), { status: 401 });
  }

  try {
    // Example: fetch products, pages, collections from Shopify Admin API
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. http://51294e-8f.myshopify.com
    const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;

    const endpoints = [
      `/admin/api/2025-10/products.json`,
      `/admin/api/2025-10/collections.json`,
      `/admin/api/2025-10/pages.json`
    ];

    const results = {};

    for (const ep of endpoints) {
      const res = await fetch(`https://${shopDomain}${ep}`, {
        headers: {
          "X-Shopify-Access-Token": adminToken,
          "Content-Type": "application/json"
        }
      });
      results[ep] = await res.json();
    }

    // Optionally save results to KV, D1, or cloud storage here

    return new Response(JSON.stringify({ status: "success", data: results }), { status: 200 });
  } catch (err) {
    console.error("Crawl error:", err);
    return new Response(JSON.stringify({ reply: "Crawl failed." }), { status: 500 });
  }
}
