import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const repo = "mnms406-bit/shelldon-vercel";
    const token = process.env.GITHUB_TOKEN;
    const shopifyDomain = process.env.SHOPIFY_DOMAIN;
    const shopifyKey = process.env.SHOPIFY_STOREFRONT_API_KEY;

    if (!token || !repo || !shopifyDomain || !shopifyKey) {
      return res.status(400).json({ error: "Missing environment variables" });
    }

    // 🛍 Fetch first 50 products
    const query = `
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              description
              vendor
              tags
            }
          }
        }
      }`;

    const shopifyRes = await fetch(`https://${shopifyDomain}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": shopifyKey,
      },
      body: JSON.stringify({ query }),
    });

    const json = await shopifyRes.json();
    if (!json.data || !json.data.products) {
      throw new Error("No products returned from Shopify");
    }

    const products = json.data.products.edges.map((e) => e.node);

    const crawlData = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        productCount: products.length,
        products,
      },
      null,
      2
    );

    // 🗃 Push to GitHub
    const githubRes = await fetch(`https://api.github.com/repos/${repo}/contents/crawl-data.json`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Test crawl (first 50 products)",
        content: Buffer.from(crawlData).toString("base64"),
      }),
    });

    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      throw new Error(`GitHub upload failed: ${githubRes.status} - ${errorText}`);
    }

    return res.status(200).json({
      status: "success",
      message: "Light crawl succeeded and data pushed to GitHub",
      count: products.length,
    });
  } catch (err) {
    console.error("Light crawl failed:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
