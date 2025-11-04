import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // e.g. "yourusername/yourrepo"

    if (!shopDomain || !storefrontToken || !githubToken || !repo) {
      return res.status(400).json({ status: "error", message: "Missing environment variables" });
    }

    // Helper to query Storefront API
    async function shopifyQuery(query) {
      const response = await fetch(`https://${shopDomain}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      return data;
    }

    // Query products, collections, and pages
    const productQuery = `
      {
        products(first: 50) {
          edges {
            node { id title handle description }
          }
        }
      }`;
    const collectionQuery = `
      {
        collections(first: 50) {
          edges {
            node { id title handle description }
          }
        }
      }`;
    const pageQuery = `
      {
        pages(first: 50) {
          edges {
            node { id title handle body }
          }
        }
      }`;

    const [products, collections, pages] = await Promise.all([
      shopifyQuery(productQuery),
      shopifyQuery(collectionQuery),
      shopifyQuery(pageQuery),
    ]);

    const crawlData = {
      products: products.data.products.edges.map((e) => e.node),
      collections: collections.data.collections.edges.map((e) => e.node),
      pages: pages.data.pages.edges.map((e) => e.node),
      timestamp: new Date().toISOString(),
    };

    // Save JSON to GitHub
    const content = Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64");
    const filename = `crawl-data-${Date.now()}.json`;

    const githubResponse = await fetch(
      `https://api.github.com/repos/${repo}/contents/public/${filename}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Update crawl data",
          content,
        }),
      }
    );

    const githubResult = await githubResponse.json();

    if (!githubResponse.ok) {
      throw new Error(`GitHub upload failed: ${githubResult.message}`);
    }

    return res.status(200).json({
      status: "success",
      message: "Crawl completed and uploaded to GitHub",
      file: githubResult.content?.path || filename,
      timestamp: crawlData.timestamp,
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
