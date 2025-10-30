import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  if (!shopDomain || !storefrontToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing Shopify environment variables.",
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

    // Crawl everything in chunks
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

    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    res.status(200).json({
      status: "success",
      message: "Crawl completed successfully",
      counts: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
      timestamp: crawlData.timestamp,
    });
  } catch (err) {
    console.error("Progressive crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
