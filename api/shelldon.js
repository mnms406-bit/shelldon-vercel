export default async function handler(req, res) {
  try {
    const { question } = req.query;

    // Shopify response
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
        const errText = await shopifyResp.text();
        throw new Error(`Shopify API error: ${shopifyResp.status} - ${errText}`);
      }

      const shopifyData = await shopifyResp.json();
      const productNames = shopifyData.products.map((p) => p.title).join(", ");

      return res.status(200).json({
        reply: `Here are some products from our store: ${productNames}`,
      });
    }

    // OpenAI response
    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content:
              "You are Shelldon, a friendly assistant for a Shopify store. Answer helpfully but briefly.",
          },
          { role: "user", content: question || "Hello Shelldon!" },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`OpenAI API error: ${aiResp.status} - ${errText}`);
    }

    const aiData = await aiResp.json();
    const reply =
      aiData.choices?.[0]?.message?.content ||
      "Sorry, I’m having trouble thinking right now.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Shelldon error:", err);
    return res
      .status(500)
      .json({ reply: `Shelldon crashed: ${err.message}` });
  }
}
