// api/refresh-crawl.js - Admin API version - sees ALL active products
export default async function handler(req, res) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = "mnms406-bit/shelldon-vercel";
  const githubPath = "data/crawl-data.json";

  if (!shopDomain || !adminToken || !githubToken) {
    return res.status(400).json({ status: "error", message: "Missing env: need SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_KEY, GITHUB_TOKEN" });
  }

  const endpoint = `https://${shopDomain}/admin/api/2024-10/graphql.json`;
  const strip = (html="") => html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

  async function fetchAll(query, type) {
    let hasNextPage = true;
    let cursor = null;
    let results = [];
    while (hasNextPage) {
      const q = query.replace("$AFTER", cursor ? `"${cursor}"` : "null");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": adminToken },
        body: JSON.stringify({ query: q }),
      });
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
    const productsQuery = `{ products(first: 50, after: $AFTER, query: "status:active") { pageInfo { hasNextPage } edges { cursor node { id title handle descriptionHtml onlineStoreUrl featuredImage { url altText } variants(first: 10) { edges { node { id title price } } } } } } } }`;
    const collectionsQuery = `{ collections(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle descriptionHtml } } } }`;
    const pagesQuery = `{ pages(first: 50, after: $AFTER) { pageInfo { hasNextPage } edges { cursor node { id title handle body } } } }`;

    const [rawProducts, rawCollections, rawPages] = await Promise.all([
      fetchAll(productsQuery, "products"),
      fetchAll(collectionsQuery, "collections"),
      fetchAll(pagesQuery, "pages"),
    ]);

    const products = rawProducts.map(p => ({
      id: p.id, title: p.title, handle: p.handle,
      description: strip(p.descriptionHtml || "").slice(0, 2000),
      onlineStoreUrl: p.onlineStoreUrl, featuredImage: p.featuredImage,
      variants: { edges: (p.variants?.edges || []).map(v => ({ node: { id: v.node.id, title: v.node.title, priceV2: { amount: String(v.node.price), currencyCode: "USD" } } })) }
    }));
    const collections = rawCollections.map(c => ({ id: c.id, title: c.title, handle: c.handle, description: strip(c.descriptionHtml || "") }));
    const pages = rawPages.map(pg => ({ id: pg.id, title: pg.title, handle: pg.handle, body: strip(pg.body || "") }));

    const crawlData = { timestamp: new Date().toISOString(), products, collections, pages };
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

    res.status(200).json({ status: "success", message: "Crawl completed and uploaded to GitHub", counts: { products: products.length, collections: collections.length, pages: pages.length }, timestamp: crawlData.timestamp });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
