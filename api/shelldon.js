import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { question } = req.query;

    // 1. Handle Shopify product requests
    if (question && question.toLowerCase().includes("product")) {
      const shopifyResp = await fetch(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products.json?limit=5`,
        {
          headers: {
            "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!shopifyResp.ok) {
        throw new Error(`Shopify API error: ${shopifyResp.statusText}`);
      }

      const shopifyData = await shopifyResp.json();
      const productNames = shopifyData.products.map((p) => p.title).join(", ");

      return res.status(200).json({
        reply: `Here are some products from our store: ${productNames}`,
      });
    }

    // 2. Otherwise, send to OpenAI
    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // fast + smart + cost efficient
        messages: [
          {
            role: "system",
            content:
              "You are Shelldon, a friendly helpful assistant on a Shopify store. Keep answers short and helpful, guide users through products, orders, or general support.",
          },
          { role: "user", content: question || "Hello Shelldon!" },
        ],
      }),
    });

    if (!aiResp.ok) {
      throw new Error(`OpenAI API error: ${aiResp.statusText}`);
    }

    const aiData = await aiResp.json();
    const reply =
      aiData.choices?.[0]?.message?.content ||
      "Sorry, I’m having trouble thinking right now.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "There was a problem contacting Shelldon." });
  }
}
