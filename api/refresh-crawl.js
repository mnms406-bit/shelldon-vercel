import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = "yourname/shopify-crawl-data"; // change this to your repo
    const SHOPIFY_DOMAIN = "51294e-8f.myshopify.com";
    const SHOPIFY_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;

    // 1. Fetch products from Shopify Storefront API
    const query = `
      {
        products(first: 100) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 3) {
                edges { node { src altText } }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Storefront-Access-Token": SHOPIFY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) throw new Error(`Shopify API error: ${response.status}`);

    const json = await response.json();
    const data = {
      products: json.data.products.edges.map((p) => p.node),
      timestamp: new Date().toISOString(),
    };

    // 2. Upload to GitHub
    const filePath = "crawl-data.json";
    const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

    // Check if file exists (to get SHA for updates)
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });

    const existing = await getRes.json();
    const sha = existing?.sha;

    // Upload (create/update)
    const putRes = await fetch(getUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update crawl data",
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha,
      }),
    });

    if (!putRes.ok) throw new Error(`GitHub upload failed: ${putRes.statusText}`);

    res.status(200).json({
      status: "success",
      message: "Crawl completed and uploaded to GitHub",
      file: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath}`,
    });
  } catch (err) {
    console.error("Crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
