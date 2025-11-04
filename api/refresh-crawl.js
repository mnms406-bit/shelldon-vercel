import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Only GET allowed" });
    }

    const { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_API_KEY } = process.env;
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_API_KEY) {
      return res.status(400).json({ error: "Missing environment variables" });
    }

    // 🔹 GraphQL queries
    const queries = {
      products: `{
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              description
              onlineStoreUrl
            }
          }
        }
      }`,
      collections: `{
        collections(first: 20) {
          edges {
            node {
              id
              title
              handle
              description
            }
          }
        }
      }`,
      pages: `{
        pages(first: 20) {
          edges {
            node {
              id
              title
              handle
              bodySummary
            }
          }
        }
      }`,
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_KEY,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (data.errors) {
        console.error(`Error fetching ${key}:`, data.errors);
      }
      results[key] = data.data ? data.data[key]?.edges?.map(e => e.node) : [];
    }

    // Save crawl data locally
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));

    res.status(200).json({
      status: "success",
      message: "Crawl completed successfully",
      counts: {
        products: results.products.length,
        collections: results.collections.length,
        pages: results.pages.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
import fetch from "node-fetch";

async function uploadToGitHub(data) {
  const repo = process.env.GITHUB_REPO;
  const file = process.env.GITHUB_FILE || "crawl-data.json";
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.warn("Missing GitHub repo or token");
    return;
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${file}`;

  // Get the current file’s SHA (if it exists)
  const current = await fetch(apiUrl, {
    headers: { Authorization: `token ${token}` },
  }).then((r) => (r.ok ? r.json() : null));

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  const body = {
    message: `Update crawl data ${new Date().toISOString()}`,
    content,
    sha: current?.sha,
  };

  const result = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    const text = await result.text();
    console.error("GitHub upload failed:", text);
  } else {
    console.log("✅ Crawl data pushed to GitHub");
  }
}

// Inside your main handler:
export default async function handler(req, res) {
  try {
    // Run your existing crawl logic...
    const results = { products, collections, pages };

    // Save locally as before (optional)
    fs.writeFileSync("/tmp/crawl-data.json", JSON.stringify(results, null, 2));

    // Push to GitHub for permanent storage
    await uploadToGitHub(results);

    res.status(200).json({
      status: "success",
      message: "Crawl completed successfully and uploaded to GitHub",
      counts: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
