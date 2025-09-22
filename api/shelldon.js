export default async function handler(req, res) {
  try {
    const { message } = req.query;
    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    // 1. Fetch products from Shopify
    const shopifyResponse = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_API_TOKEN
      },
      body: JSON.stringify({
        query: `
          {
            products(first: 5) {
              edges {
                node {
                  title
                  description
                  onlineStoreUrl
                }
              }
            }
            collections(first: 3) {
              edges {
                node {
                  title
                  description
                }
              }
            }
          }
        `
      })
    });

    const shopifyData = await shopifyResponse.json();
    const products = shopifyData.data?.products?.edges?.map(e => e.node) || [];
    const collections = shopifyData.data?.collections?.edges?.map(e => e.node) || [];

    // 2. Pass products + collections to OpenAI
    const context = `
    Store products: ${JSON.stringify(products, null, 2)}
    Store collections: ${JSON.stringify(collections, null, 2)}
    `;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are Shelldon, a shopping assistant for the store at https://${process.env.SHOPIFY_STORE_DOMAIN}. 
                      Answer based only on the provided store data.`
          },
          {
            role: "assistant",
            content: context
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
      console.error("OpenAI error:", aiData.error);
      return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
    }

    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I don’t have an answer for that.";
    res.status(200).json({ reply });

  } catch (err) {
    console.error("Shelldon.js failed:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
