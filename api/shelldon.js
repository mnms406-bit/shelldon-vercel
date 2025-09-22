// /api/shelldon.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const allowedOrigins = ["https://enajif.com", "http://51294e-8f.myshopify.com"];

module.exports = async (req, res) => {
  // CORS
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const message = req.query.message || req.body.message;
    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    const prompt = `
      You are Shelldon, a virtual shopping assistant for http://51294e-8f.myshopify.com.
      Use the website content to answer user questions accurately.
      User: "${message}"
      Shelldon:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Shelldon error:", error);
    return res.status(500).json({ reply: "Shelldon couldn’t get a response right now." });
  }
};
