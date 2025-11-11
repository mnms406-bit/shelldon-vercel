import fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;
const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const githubRepo = "mnms406-bit/shelldon-vercel"; // replace if needed
const githubBranch = "main"; // branch to store crawl
const githubPath = "crawl-data.json"; // path in repo

if (!shopDomain || !storefrontToken || !githubToken) {
  throw new Error(
    "Missing environment variables: SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_API_KEY, or GITHUB_PERSONAL_ACCESS_TOKEN"
  );
}

const octokit = new Octokit({ auth: githubToken });
const endpoint = `https://${shopDomain}/api/2024-10/graphql.json`;

async function fetchAll(query, type) {
  let hasNextPage = true;
  let cursor = null;
  let results = [];

  while (hasNextPage) {
    const paginatedQuery = query.replace("$AFTER", cursor ? `"${cursor}"` : "null");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: paginatedQuery }),
    });

    const json = await res.json();

    if (!json.data || !json.data[type]) break;

    const connection = json.data[type];

    results = [...results, ...connection.edges.map((e) => e.node)];
    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = hasNextPage ? connection.edges[connection.edges.length - 1].cursor : null;
  }

  return results;
}

export default async function handler(req, res) {
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

    // Save to GitHub
    const fileContent = Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64");

    // Get current file SHA if exists
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner: githubRepo.split("/")[0],
        repo: githubRepo.split("/")[1],
        path: githubPath,
        ref: githubBranch,
      });
      sha = data.sha;
    } catch {
      // File does not exist, will create
      sha = undefined;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: githubRepo.split("/")[0],
      repo: githubRepo.split("/")[1],
      path: githubPath,
      message: `Update crawl data ${crawlData.timestamp}`,
      content: fileContent,
      branch: githubBranch,
      sha,
    });

    res.status(200).json({
      status: "success",
      message: "Crawl completed and saved to GitHub",
      counts: {
        products: products.length,
        collections: collections.length,
        pages: pages.length,
      },
      timestamp: crawlData.timestamp,
    });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
