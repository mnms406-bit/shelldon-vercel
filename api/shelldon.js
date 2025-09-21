// api/shelldon.js

export default async function handler(req, res) {
  try {
    // Only GET or POST requests with 'message' param
    const userMessage = req.query.message || (req.body && req.body.message);
    if (!userMessage) {
      return res.status(400).json({ reply: "No message provided." });
    }

    // OpenAI API call
    const OPENAI_KEY = process.env.OPENAI_API_KEY; // Make sure this is set in Vercel
    if (!OPENAI_KEY) {
      return res.status(500).json({ reply: "OpenAI API key not configured." });
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are Shelldon, a helpful assistant for the Shopify store 51294e-8f.myshopify.com." },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 400
      }),
    });

    const data = await openAiResponse.json();

    if (!data.choices || !data.choices[0].message) {
      return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
    }

    const replyText = data.choices[0].message.content;
    return res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error("Shelldon API error:", err);
    return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
