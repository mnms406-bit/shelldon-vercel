// Shelldon Vercel serverless function
// Uses built-in fetch, no node-fetch needed

const SHOPIFY_STORE = "51294e-8f.myshopify.com"; // Your Shopify store
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN; // Storefront Access Token
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API key

export default async function handler(req, res) {
  const userMessage = req.query.message || "";

  // Fetch Shopify site content
  async function fetchShopifyContent() {
    const queries = {
      products: `{ products(first: 50) { edges { node { title description tags } } } }`,
      collections: `{ collections(first: 20) { edges { node { title description } } } }`,
      pages: `{ pages(first: 20) { edges { node { title body } } } }`
    };

    const fetchGraphQL = async (query) => {
      const response = await fetch(`https://${SHOPIFY_STORE}/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
        },
        body: JSON.stringify({ query })
      });
      if (!response.ok) throw new Error(`Shopify fetch failed: ${response.status}`);
      const data = await response.json();
      return data.data;
    };

    const [productsData, collectionsData, pagesData] = await Promise.all([
      fetchGraphQL(queries.products),
      fetchGraphQL(queries.collections),
      fetchGraphQL(queries.pages)
    ]);

    const content = [];

    productsData.products.edges.forEach(edge => {
      content.push(`[PRODUCT] ${edge.node.title}: ${edge.node.description}`);
    });
    collectionsData.collections.edges.forEach(edge => {
      content.push(`[COLLECTION] ${edge.node.title}: ${edge.node.description}`);
    });
    pagesData.pages.edges.forEach(edge => {
      content.push(`[PAGE] ${edge.node.title}: ${edge.node.body}`);
    });

    return content.join("\n");
  }

  try {
    const siteContent = await fetchShopifyContent();

    // Create OpenAI prompt
    const prompt = `
You are Shelldon, the virtual shopping assistant for ${SHOPIFY_STORE}.
Use the following site content to answer the user's question accurately and concisely:

${siteContent}

User question: ${userMessage}
Answer:
`;

    // Call OpenAI API
    const openaiRes = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI API error: ${openaiRes.status} - ${errText}`);
    }

    const data = await openaiRes.json();
    const reply = data.choices[0].text.trim();

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
