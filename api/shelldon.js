export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  const SHOP_DOMAIN = '51294e-8f.myshopify.com';
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

  try {
    // 1️⃣ Fetch Shopify data
    const query = `
      {
        products(first: 50) { edges { node { title description } } }
        collections(first: 20) { edges { node { title description } } }
        pages(first: 20) { edges { node { title body } } }
      }
    `;
    const shopRes = await fetch(`https://${SHOP_DOMAIN}/api/2025-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query })
    });
    const shopData = await shopRes.json();

    // 2️⃣ Build a concise summary for OpenAI
    const products = shopData.data.products.edges.map(e => `${e.node.title}: ${e.node.description}`).join('\n');
    const collections = shopData.data.collections.edges.map(e => `${e.node.title}: ${e.node.description}`).join('\n');
    const pages = shopData.data.pages.edges.map(e => `${e.node.title}: ${e.node.body}`).join('\n');

    const systemPrompt = `
      You are Shelldon, the virtual assistant for the Shopify store at ${SHOP_DOMAIN}.
      Only provide answers relevant to this store's products, collections, and pages.
      
      PRODUCTS:
      ${products}

      COLLECTIONS:
      ${collections}

      PAGES:
      ${pages}
    `;

    // 3️⃣ Call OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
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
    console.error("Shelldon error:", err);
    res.status(500).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
