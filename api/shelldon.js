import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const userMessage = req.query.message || "Hello";

    // Hardcoded Shopify domain
    const shopDomain = "51294e-8f.myshopify.com";

    // Storefront API token (keep in Vercel env)
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

    // GraphQL query for first 5 products
    const query = `
      {
        products(first: 5) {
          edges {
            node {
              title
              description
            }
          }
        }
      }
    `;

    const shopifyResponse = await fetch(`https://${shopDomain}/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query }),
    });

    const shopifyData = await shopifyResponse.json();

    const products = shopifyData?.data?.products?.edges || [];
    const productList = products.map((p, i) => `${i + 1}. ${p.node.title}`).join("\n");

    // Pass context + user query to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Shelldon, a helpful shopping assistant for ${shopDomain}.
          Use these products if relevant:\n${productList}`,
        },
        { role: "user", content: userMessage },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Shelldon crashed:", err);
    res.status(500).json({ reply: `Shelldon crashed: ${err.message}` });
  }
}
