// api/shelldon.js

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const userMessage = req.query.message || "Hello Shelldon!";

    // 🔒 API key comes from Vercel environment variable
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Hardcoded Shopify store domain (your store brain)
    const SHOPIFY_STORE_DOMAIN = "51294e-8f.myshopify.com";

    const systemPrompt = `
You are Shelldon, a friendly AI shopping assistant for Enajif.com.
Your brain is connected to the Shopify store at ${SHOPIFY_STORE_DOMAIN}.
Answer customer questions using product, collection, or page context from this store.
If you don’t know, politely say so instead of making things up.
Always keep answers short, clear, and helpful.
    `;

    // Ask OpenAI
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.json();
      throw new Error(`OpenAI API error: ${aiResponse.status} - ${JSON.stringify(error)}`);
    }

    const result = await aiResponse.json();
    const reply = result.choices?.[0]?.message?.content || "Hmm, I don’t know what to say.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(200).json({ reply: "Error: I couldn’t connect to my brain right now." });
  }
}
