import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = "mnms406-bit/shelldon-vercel";
  const githubPath = "data/crawl-data.json";

  if (!shopDomain || !storefrontToken || !githubToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing environment variables.",
    });
  }

  const endpoint = `https://${shopDomain}/api/2024-10/graphql.json`;

  async function fetchAll(query, type) {
    let hasNextPage = true;
    let cursor = null;
    let results = [];

    while (hasNextPage) {
      const paginatedQuery = query.replace("$AFTER", cursor ? `"${cursor}"` : "null");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({ query: paginatedQuery }),
      });

      const json = await response.json();
      const connection = json.data[type];
      if (!connection) break;

      results = [...results, ...connection.edges.map((e) => e.node)];
      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = hasNextPage ? connection.edges[connection.edges.length - 1].cursor : null;
    }

    return results;
  }

  try {
    const productsQuery = `
      {
 products(first: 50, after: $AFTER) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              title
              handle
              description
              onlineStoreUrl
              featuredImage { url altText }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    priceV2 { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const collectionsQuery = `
      {
        collections(first: 50, after: $AFTER) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              title
              handle
              description
            }
          }
        }
      }
    `;

    const pagesQuery = `
      {
        pages(first: 50, after: $AFTER) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              title
              handle
              body
            }
          }
        }
      }
    `;

    // Crawl everything
    const [products, collections, pages] = await Promise.all([
      fetchAll(productsQuery, "products"),
      fetchAll(collectionsQuery, "collections"),
      fetchAll(pagesQuery, "pages"),
    ]);

    const crawlData = {
      timestamp: new Date().toISOString(),
      products,
      collections,
      pages,
    };

    const content = Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64");

    // Step 1: Check if file exists
    const checkRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    let sha = null;
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Step 2: Upload or update file
    const uploadRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Automated crawl update",
        content,
        sha, // ✅ only included if file already exists
      }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`GitHub upload failed: ${err}`);
    }

    res.status(200).json({
      status: "success",
      message: "Crawl completed and uploaded to GitHub",
      counts: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
      timestamp: crawlData.timestamp,
    });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
