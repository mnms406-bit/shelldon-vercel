import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const userMessage = req.query.message || "Hello";

    // Hardcoded Shopify domain
    const shopDomain = "51294e-8f.myshopify.com";

    // Fetch sample products from Shopify
    const shopifyResponse = await fetch(`https://${shopDomain}/products.json?limit=5`);
    const shopifyData = await shopifyResponse.json();
    const productList = shopifyData.products
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join("\n");

    // Send to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Shelldon, a helpful shopping assistant for ${shopDomain}. 
          When a user asks a question, use this product list if relevant:\n${productList}`,
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
