export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  try {
    // Shopify Storefront API
    const shopDomain = "51294e-8f.myshopify.com"; // your store
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    const query = `
      {
        products(first: 50) { edges { node { title description } } }
        collections(first: 20) { edges { node { title description } } }
        pages(first: 20) { edges { node { title body } } }
      }
    `;

    const shopRes = await fetch(`https://${shopDomain}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query })
    });
    const shopData = await shopRes.json();

    // Build context for AI
    const context = [];

    // Products
    shopData.data.products.edges.forEach(e => {
      context.push(`Product: ${e.node.title}\n${e.node.description}`);
    });
    // Collections
    shopData.data.collections.edges.forEach(e => {
      context.push(`Collection: ${e.node.title}\n${e.node.description}`);
    });
    // Pages
    shopData.data.pages.edges.forEach(e => {
      context.push(`Page: ${e.node.title}\n${e.node.body}`);
    });

    // Call OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are Shelldon, a Shopify virtual assistant. Use this knowledge to answer user questions:\n${context.join("\n\n")}` },
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
