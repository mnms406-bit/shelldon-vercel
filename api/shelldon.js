import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Allow your frontend to call this API
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  try {
    // 🧩 Load Shelldon's brain (crawl data)
    const filePath = path.join("/tmp", "crawl-data.json");
    let crawlData = {};

    if (fs.existsSync(filePath)) {
      crawlData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else {
      crawlData = { info: "No crawl data found." };
    }

    // 🧠 Create system message using the crawl data
    const brainData = JSON.stringify(crawlData).slice(0, 12000); // limit for token safety

    const systemPrompt = `
      You are Shelldon, the friendly and knowledgeable virtual assistant for the Shopify store https://enajif.com.
      You have access to this store data (products, collections, and pages):
      ${brainData}
      Only answer based on this data. 
      If the user asks about pricing, use the product info from the data above.
      Be concise, helpful, and always reference real store items when possible.
    `;

    // 🗣️ Query OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Shelldon couldn’t get a response right now.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Shelldon serverless error:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
