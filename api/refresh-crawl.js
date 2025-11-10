import fetch from "node-fetch";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = "mnms406-bit/shelldon-vercel";

  if (!shopDomain || !storefrontToken || !githubToken) {
    return res.status(400).json({ status: "error", message: "Missing environment variables." });
  }

  try {
    const crawlData = {
      timestamp: new Date().toISOString(),
      products: [],
      collections: [],
      pages: [],
    };

    // ---- PRODUCTS ----
    let page = 1;
    let hasMoreProducts = true;
    while (hasMoreProducts) {
      const prodRes = await fetch(`https://${shopDomain}/products.json?limit=50&page=${page}`, {
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
      });
      const prodData = await prodRes.json();
      if (!prodData.products || prodData.products.length === 0) {
        hasMoreProducts = false;
      } else {
        crawlData.products.push(...prodData.products);
        page++;
      }
    }

    // ---- COLLECTIONS ----
    page = 1;
    let hasMoreCollections = true;
    while (hasMoreCollections) {
      const colRes = await fetch(`https://${shopDomain}/collections.json?limit=50&page=${page}`, {
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
      });
      const colData = await colRes.json();
      if (!colData.collections || colData.collections.length === 0) {
        hasMoreCollections = false;
      } else {
        crawlData.collections.push(...colData.collections);
        page++;
      }
    }

    // ---- PAGES ----
    page = 1;
    let hasMorePages = true;
    while (hasMorePages) {
      const pageRes = await fetch(`https://${shopDomain}/pages.json?limit=50&page=${page}`, {
        headers: {
          "X-Shopify-Storefront-Access-Token": storefrontToken,
          "Content-Type": "application/json",
        },
      });
      const pageData = await pageRes.json();
      if (!pageData.pages || pageData.pages.length === 0) {
        hasMorePages = false;
      } else {
        crawlData.pages.push(...pageData.pages);
        page++;
      }
    }

    // ---- SAVE TO GITHUB ----
    const path = "crawl-data.json";
    const commitMessage = `Full-site crawl update - ${crawlData.timestamp}`;

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64"),
      }),
    });

    res.status(200).json({ status: "success", message: "Full-site crawl completed and saved to GitHub." });
  } catch (err) {
    console.error("Full-site crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
