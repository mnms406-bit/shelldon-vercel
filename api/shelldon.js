export default async function handler(req, res) {
  // CORS setup: frontend domain only
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  try {
    // Shopify API
    const shopDomain = '51294e-8f.myshopify.com';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN; // set in Vercel

    const graphqlFetch = async (query) => {
      const res = await fetch(`https://${shopDomain}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      return data.data;
    };

    // Fetch minimal batches for stability
    const [productsData, collectionsData, pagesData] = await Promise.all([
      graphqlFetch(`{ products(first:5) { edges { node { title description } } } }`),
      graphqlFetch(`{ collections(first:5) { edges { node { title description } } } }`),
      graphqlFetch(`{ pages(first:5) { edges { node { title body } } } }`)
    ]);

    const siteContent = [];

    productsData.products.edges.forEach(e => {
      siteContent.push({ type: 'product', title: e.node.title, description: e.node.description });
    });
    collectionsData.collections.edges.forEach(e => {
      siteContent.push({ type: 'collection', title: e.node.title, description: e.node.description });
    });
    pagesData.pages.edges.forEach(e => {
      siteContent.push({ type: 'page', title: e.node.title, description: e.node.body });
    });

    // OpenAI request
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Shelldon, a virtual assistant for the Shopify store at http://51294e-8f.myshopify.com. Use the following site content to answer user questions:\n${JSON.stringify(siteContent)}`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const openaiData = await openaiRes.json();
    const reply = openaiData?.choices?.[0]?.message?.content || "Shelldon couldn’t get a response right now.";

    res.status(200).json({ reply });

  } catch (err) {
    console.error("Shelldon serverless error:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
