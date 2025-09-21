export default async function handler(req, res) {
  try {
    const { message } = req.query;

    // Use the stable 2023-10 API version
    const SHOPIFY_API_VERSION = "2023-10";

    // GraphQL query to fetch products (you can change this later)
    const query = `
      {
        products(first: 3) {
          edges {
            node {
              title
              handle
              onlineStoreUrl
            }
          }
        }
      }
    `;

    // Fetch from Shopify
    const shopifyRes = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_API_KEY,
        },
        body: JSON.stringify({ query }),
      }
    );

    const shopifyData = await shopifyRes.json();

    // Pass both the user message + store data into OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Shelldon, a friendly shopping assistant for Enajif.com.",
          },
          {
            role: "user",
            content: `${message}\n\nShopify data: ${JSON.stringify(shopifyData)}`,
          },
        ],
      }),
    });

    const aiData = await aiRes.json();
    const reply =
      aiData.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t get a response right now.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error in Shelldon handler:", error);
    res.status(500).json({ reply: "Error connecting to Shelldon." });
  }
}
