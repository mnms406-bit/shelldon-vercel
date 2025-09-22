// shelldon.js - Vercel Serverless Function
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Securely stored in Vercel
});

export default async function handler(req, res) {
  // === CORS for your Shopify store domain ===
  res.setHeader('Access-Control-Allow-Origin', 'http://51294e-8f.myshopify.com'); // Shopify store
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
      model: "gpt-4o-mini",
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
