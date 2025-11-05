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

    async function shopifyQuery(query, variables = {}) {
      const r = await fetch(`https://${shopifyDomain}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": shopifyKey,
        },
        body: JSON.stringify({ query, variables }),
      });
      const json = await r.json();
      if (json.errors) console.error("Shopify GraphQL errors:", json.errors);
      return json.data;
    }

    // Helper: Paginate through data
    async function fetchAll(query, path, extract) {
      let cursor = null;
      let items = [];
      let hasNextPage = true;
      let chunkCount = 0;

      while (hasNextPage && chunkCount < 5) {
        const data = await shopifyQuery(query, { cursor });
        const edges = extract(data);
        if (!edges) break;

        items.push(...edges.map((e) => e.node));
        const pageInfo = path.split(".").reduce((a, b) => a[b], data).pageInfo;
        cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
        hasNextPage = pageInfo.hasNextPage;
        chunkCount++;
      }
      return items;
    }

    // --- PRODUCTS ---
    const productQuery = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id title handle description vendor tags
              images(first: 5) { edges { node { src altText } } }
            }
          }
        }
      }`;
    const products = await fetchAll(productQuery, "products", (d) => d.products.edges);

    // --- COLLECTIONS ---
    const collectionQuery = `
      query getCollections($cursor: String) {
        collections(first: 50, after: $cursor) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id title handle description
              image { src altText }
              products(first: 10) { edges { node { title handle id } } }
            }
          }
        }
      }`;
    const collections = await fetchAll(collectionQuery, "collections", (d) => d.collections.edges);

    // --- PAGES (Shopify Online Store Pages via metaobjects) ---
    const pagesQuery = `
      query getPages($cursor: String) {
        pages(first: 50, after: $cursor) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id title handle body
            }
          }
        }
      }`;
    const pages = await fetchAll(pagesQuery, "pages", (d) => d.pages.edges);

    // 🧩 Combine data
    const crawlData = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        counts: {
          products: products.length,
          collections: collections.length,
          pages: pages.length,
        },
        products,
        collections,
        pages,
      },
      null,
      2
    );

    // 🗃️ Commit to GitHub
    const githubResponse = await fetch(
      `https://api.github.com/repos/${repo}/contents/crawl-data.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Full crawl update (products, collections, pages)",
          content: Buffer.from(crawlData).toString("base64"),
        }),
      }
    );

    if (!githubResponse.ok) {
      throw new Error(`GitHub upload failed: ${githubResponse.statusText}`);
    }

    return res.status(200).json({
      status: "success",
      message: "Full crawl completed and pushed to GitHub",
      summary: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
    });
  } catch (err) {
    console.error("Full crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
