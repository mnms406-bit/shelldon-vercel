import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_API_KEY;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = "mnms406-bit/shelldon-vercel";
  const githubPath = "data/crawl-data.json";

  if (!shopDomain || !githubToken || (!adminToken && !storefrontToken)) {
    return res.status(400).json({ status: "error", message: "Missing env: need SHOPIFY_STORE_DOMAIN + GITHUB_TOKEN + SHOPIFY_ADMIN_API_KEY or SHOPIFY_STOREFRONT_API_KEY" });
  }

  const useAdmin = !!adminToken;
  const endpoint = useAdmin
    ? `https://${shopDomain}/admin/api/2024-10/graphql.json`
    : `https://${shopDomain}/api/2024-10/graphql.json`;

  const headers = useAdmin
    ? { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken }
    : { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": storefrontToken };

  const strip = (html="") => html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

  async function fetchAll(query, type) {
    let hasNextPage = true;
    let cursor = null;
    let results = [];
    while (hasNextPage) {
      const q = query.replace("$AFTER", cursor ? `"${cursor}"` : "null");
      const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ query: q }) });
      const json = await response.json();
      if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0,500));
      const connection = json.data[type];
      if (!connection) break;
      results = [...results, ...connection.edges.map(e => e.node)];
      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = hasNextPage ? connection.edges[connection.edges.length-1].cursor : null;
    }
    return results;
  }

  try {
    const productsQuery = useAdmin
      ? `{ products(first: 50, after: $AFTER, query: "status:active") { pageInfo { hasNextPage } edges { cursor node { id title handle descriptionHtml onlineStoreUrl featuredImage { url altText } variants(first: 10) { edges { node { id title price } } } } } } } }`
      : `{ products(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle description onlineStoreUrl featuredImage { url altText } variants(first: 10) { edges { node { id title priceV2 { amount currencyCode } } } } } } } } }`;

    const collectionsQuery = useAdmin
      ? `{ collections(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle descriptionHtml } } } }`
      : `{ collections(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle description } } } }`;

    const pagesQuery = `{ pages(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle body } } } }`;

    const [rawProducts, rawCollections, rawPages] = await Promise.all([
      fetchAll(productsQuery, "products"),
      fetchAll(collectionsQuery, "collections"),
      fetchAll(pagesQuery, "pages"),
    ]);

    // normalize to Shelldon shape
    const products = rawProducts.map(p => ({
      id: p.id, title: p.title, handle: p.handle,
      description: useAdmin ? strip(p.descriptionHtml || "").slice(0,2000) : (p.description || "").slice(0,2000),
      onlineStoreUrl: p.onlineStoreUrl, featuredImage: p.featuredImage,
      variants: { edges: (p.variants?.edges || []).map(v => {
        if (useAdmin) return { node: { id: v.node.id, title: v.node.title, priceV2: { amount: String(v.node.price), currencyCode: "USD" } } };
        return v;
      })}
    }));
    const collections = rawCollections.map(c => ({
      id: c.id, title: c.title, handle: c.handle,
      description: useAdmin ? strip(c.descriptionHtml || "") : (c.description || "")
    }));
    const pages = rawPages.map(pg => ({ id: pg.id, title: pg.title, handle: pg.handle, body: typeof pg.body === "string" ? strip(pg.body) : (pg.body || "") }));

    const crawlData = { timestamp: new Date().toISOString(), products, collections, pages, source: useAdmin ? "admin" : "storefront" };
    const content = Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64");

    const checkRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      headers: { Authorization: `token ${githubToken}` },
    });
    let sha = null;
    if (checkRes.ok) sha = (await checkRes.json()).sha;

    const uploadRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      method: "PUT",
      headers: { Authorization: `token ${githubToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Automated crawl update", content, sha }),
    });
    if (!uploadRes.ok) throw new Error(`GitHub upload failed: ${await uploadRes.text()}`);

    res.status(200).json({ status: "success", source: useAdmin ? "admin" : "storefront", message: "Crawl completed and uploaded to GitHub", counts: { products: products.length, collections: collections.length, pages: pages.length }, timestamp: crawlData.timestamp });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
