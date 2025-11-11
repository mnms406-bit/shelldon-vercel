import fs from "fs";
import path from "path";
import fetch from "node-fetch";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  if (!shopDomain || !storefrontToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing Shopify environment variables.",
    });
  }

  const endpoint = `https://${shopDomain}/api/2023-07/graphql.json`;

  // GraphQL query for products, collections, pages
  const query = `
    query getProductsCollectionsPages($productCursor: String, $collectionCursor: String, $pageCursor: String) {
      products(first: 50, after: $productCursor) {
        edges { node { id title handle description onlineStoreUrl createdAt updatedAt tags variants(first:10) { edges { node { id title sku availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode } } } } images(first:10) { edges { node { url altText } } } } }
        pageInfo { hasNextPage endCursor }
      }
      collections(first: 20, after: $collectionCursor) {
        edges { node { id title handle description updatedAt products(first:10) { edges { node { id title handle } } } } }
        pageInfo { hasNextPage endCursor }
      }
      pages(first: 20, after: $pageCursor) {
        edges { node { id title handle body createdAt updatedAt } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let crawlData = {
    products: [],
    collections: [],
    pages: [],
    timestamp: new Date().toISOString(),
  };

  try {
    let productCursor = null;
    let collectionCursor = null;
    let pageCursor = null;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query,
          variables: { productCursor, collectionCursor, pageCursor },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ status: "error", message: text });
      }

      const { data, errors } = await response.json();
      if (errors) return res.status(500).json({ status: "error", message: errors });

      // Append results
      crawlData.products.push(...data.products.edges.map(e => e.node));
      crawlData.collections.push(...data.collections.edges.map(e => e.node));
      crawlData.pages.push(...data.pages.edges.map(e => e.node));

      // Update cursors
      productCursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
      collectionCursor = data.collections.pageInfo.hasNextPage ? data.collections.pageInfo.endCursor : null;
      pageCursor = data.pages.pageInfo.hasNextPage ? data.pages.pageInfo.endCursor : null;

      hasMore = productCursor || collectionCursor || pageCursor;
    }

    // Save to tmp folder for get crawl
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2));

    res.status(200).json({ status: "success", message: "Crawl completed", counts: { products: crawlData.products.length, collections: crawlData.collections.length, pages: crawlData.pages.length }, timestamp: crawlData.timestamp });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
