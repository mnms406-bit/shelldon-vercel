import fetch from "node-fetch";

export default async function handler(req, res) {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // e.g. 51294e-8f.myshopify.com
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_KEY;

  try {
    // Crawl products
    const productsRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query: `
        {
          products(first:250){
            edges{
              node{
                id
                title
                handle
                description
                images(first:5){edges{node{url}}}
              }
            }
          }
          collections(first:50){
            edges{
              node{
                id
                title
                handle
              }
            }
          }
          pages(first:50){
            edges{
              node{
                id
                title
                handle
                body
              }
            }
          }
        }`
      })
    });

    const crawlData = await productsRes.json();
    const jsonContent = JSON.stringify({
      timestamp: new Date().toISOString(),
      data: crawlData
    }, null, 2);

    // Push to GitHub
    const { GITHUB_TOKEN, GITHUB_REPO, CRAWL_PATH } = process.env;

    // Get the SHA of the existing file (optional, required for update)
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CRAWL_PATH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    let sha;
    if (getRes.status === 200) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CRAWL_PATH}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Update crawl data ${new Date().toISOString()}`,
        content: Buffer.from(jsonContent).toString("base64"),
        sha
      })
    });

    const commitResult = await commitRes.json();
    if (commitRes.ok) {
      res.status(200).json({ status: "success", message: "Crawl completed and pushed to GitHub", commit: commitResult.commit.sha });
    } else {
      res.status(500).json({ status: "error", message: "GitHub commit failed", details: commitResult });
    }

  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
