import fs from "fs/promises";

// Configure your Shopify store
const SHOPIFY_DOMAIN = "51294e-8f.myshopify.com";
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN; // public storefront token

// Chunk size (number of items per batch)
const CHUNK_SIZE = 50;

// State storage file to track progress
const STATE_FILE = "./crawl-state.json";

// Utility to fetch Shopify Storefront GraphQL
async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  return res.json();
}

// Load crawl state
async function loadState() {
  try {
    const content = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return { productsCursor: null, collectionsCursor: null, pagesCursor: null };
  }
}

// Save crawl state
async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export default async function handler(req, res) {
  // Allow CORS from your frontend
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const state = await loadState();

  try {
    // --- Products ---
    const productQuery = `
      query ($cursor: String) {
        products(first: ${CHUNK_SIZE}, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
              handle
              description
              images(first: 5) { edges { node { src } } }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    `;

    const productData = await shopifyFetch(productQuery, { cursor: state.productsCursor });
    const products = productData.data.products.edges.map(e => e.node);
    const lastProductCursor = products.length ? productData.data.products.edges[products.length - 1].cursor : null;
    const productsNext = productData.data.products.pageInfo.hasNextPage;

    await fs.writeFile(`./data/products_${Date.now()}.json`, JSON.stringify(products, null, 2));

    // Update state
    state.productsCursor = productsNext ? lastProductCursor : null;

    // --- Collections ---
    const collectionQuery = `
      query ($cursor: String) {
        collections(first: ${CHUNK_SIZE}, after: $cursor) {
          edges {
            cursor
            node { id title handle description }
          }
          pageInfo { hasNextPage }
        }
      }
    `;
    const collectionData = await shopifyFetch(collectionQuery, { cursor: state.collectionsCursor });
    const collections = collectionData.data.collections.edges.map(e => e.node);
    const lastCollectionCursor = collections.length ? collectionData.data.collections.edges[collections.length - 1].cursor : null;
    const collectionsNext = collectionData.data.collections.pageInfo.hasNextPage;

    await fs.writeFile(`./data/collections_${Date.now()}.json`, JSON.stringify(collections, null, 2));
    state.collectionsCursor = collectionsNext ? lastCollectionCursor : null;

    // --- Pages ---
    const pageQuery = `
      query ($cursor: String) {
        pages(first: ${CHUNK_SIZE}, after: $cursor) {
          edges {
            cursor
            node { id title handle body }
          }
          pageInfo { hasNextPage }
        }
      }
    `;
    const pageData = await shopifyFetch(pageQuery, { cursor: state.pagesCursor });
    const pages = pageData.data.pages.edges.map(e => e.node);
    const lastPageCursor = pages.length ? pageData.data.pages.edges[pages.length - 1].cursor : null;
    const pagesNext = pageData.data.pages.pageInfo.hasNextPage;

    await fs.writeFile(`./data/pages_${Date.now()}.json`, JSON.stringify(pages, null, 2));
    state.pagesCursor = pagesNext ? lastPageCursor : null;

    // Save updated state
    await saveState(state);

    res.status(200).json({
      status: "success",
      crawled: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
      state,
    });
  } catch (err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
