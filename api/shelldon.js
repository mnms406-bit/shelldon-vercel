// Vercel serverless function: /api/shelldon.js

// No need for node-fetch in Node 18+ (Vercel uses Node 20+)
const SHOPIFY_STORE = "enajif.com"; // your public Shopify domain
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN; // add in Vercel env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // add in Vercel env

// Helper: Fetch Shopify GraphQL
async function fetchShopify(query) {
  const res = await fetch(`https://${SHOPIFY_STORE}/api/2025-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const data = await res.json();
  return data.data;
}

// Fetch all site content
async function fetchEntireSite() {
  const queries = {
    products: `{ products(first: 250) { edges { node { title description tags handle } } } }`,
    collections: `{ collections(first: 50) { edges { node { title description handle } } } }`,
    pages: `{ pages(first: 50) { edges { node { title body handle } } } }`,
  };

  const [productsData, collectionsData, pagesData] = await Promise.all([
    fetchShopify(queries.products),
    fetchShopify(queries.collections),
    fetchShopify(queries.pages),
  ]);

  const siteContent = [];

  productsData.products.edges.forEach(edge => {
    siteContent.push({
      type: "product",
      title: edge.node.title,
      description: edge.node.description,
      handle: edge.node.handle,
    });
  });
  collectionsData.collections.edges.forEach(edge => {
    siteContent.push({
      type: "collection",
      title: edge.node.title,
      description: edge.node.description,
      handle: edge.node.handle,
    });
  });
  pagesData.pages.edges.forEach(edge => {
    siteContent.push({
      type: "page",
      title: edge.node.title,
      description: edge.node.body,
      handle: edge.node.handle,
    });
  });

  return siteContent;
}

// Helper: Query OpenAI
async function askOpenAI(question) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Shelldon, a helpful virtual assistant for a Shopify store." },
        { role: "user", content: question }
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// Main handler
export default async function handler(req, res) {
  const message = req.query.message || "";

  // Default greeting
  let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  if (message) {
    try {
      const siteContent = await fetchEntireSite();
      const lowerMsg = message.toLowerCase();

      // Try matching Shopify content first
      let matched = false;
      for (const item of siteContent) {
        if ((item.title && item.title.toLowerCase().includes(lowerMsg)) ||
            (item.description && item.description.toLowerCase().includes(lowerMsg))) {
          reply = `${item.type.toUpperCase()}: ${item.title}\n${item.description}`;
          matched = true;
          break;
        }
      }

      // If no match, query OpenAI
      if (!matched) {
        reply = await askOpenAI(message);
      }

    } catch (err) {
      console.error(err);
      reply = "Shelldon couldn't get a response right now. Please try again later.";
    }
  }

  res.status(200).json({ reply });
}
