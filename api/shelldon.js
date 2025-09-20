// Vercel-compatible native fetch (Node.js 18+ supports fetch natively)

// Shopify store (public, can stay in code)
const SHOPIFY_STORE = "51294e-8f.myshopify.com";

// Tokens as environment variables
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN; // Admin API token
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API key

export default async function handler(req, res) {
  const message = req.query.message || "";

  // Default fallback message
  let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

  try {
    // Send request to OpenAI
    const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        max_tokens: 300
      })
    });

    const openAIData = await openAIRes.json();

    if (openAIData?.choices && openAIData.choices.length > 0) {
      reply = openAIData.choices[0].message.content.trim();
    } else {
      reply = "Shelldon couldn’t get a response right now.";
    }

  } catch (err) {
    console.error("OpenAI API error:", err);
    reply = "Shelldon couldn’t get a response right now.";
  }

  res.status(200).json({ reply });
}
