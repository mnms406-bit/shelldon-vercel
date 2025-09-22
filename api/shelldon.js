// shelldon.js - Vercel Serverless Function
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Store your key in Vercel Environment Variables
});

export default async function handler(req, res) {
  // === CORS ===
  res.setHeader('Access-Control-Allow-Origin', '*'); // or 'https://yourshopifydomain.com'
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const message = req.query.message || '';

    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or any model you prefer
      messages: [
        {
          role: "system",
          content: "You are Shelldon, a virtual shopping assistant for the Shopify store at http://51294e-8f.myshopify.com. Answer questions about products, collections, and pages from this store."
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content.trim();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ reply: "⚠️ Shelldon couldn’t get a response." });
  }
}
