// Vercel-compatible serverless function
export default async function handler(req, res) {
  try {
    const userMessage = req.query.message || "";

    // Hardcoded Shopify store
    const SHOPIFY_STORE = "51294e-8f.myshopify.com";

    // OpenAI API Key (stored in Vercel environment variables)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not found in environment variables.");
    }

    // Optional: You could fetch store content via Shopify Storefront API here
    // For now, we'll assume OpenAI will use your store content for responses

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are Shelldon, the virtual assistant for ${SHOPIFY_STORE}. Answer questions only based on the store content. If you don't know, reply: "I couldn’t find an answer on the store."`,
          },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    let reply = "Shelldon couldn’t get a response right now.";
    if (data.choices && data.choices[0].message && data.choices[0].message.content) {
      reply = data.choices[0].message.content;
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
