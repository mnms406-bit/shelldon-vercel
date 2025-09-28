// api/shelldon.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Enable CORS for your frontend
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  const crawlFilePath = path.join(process.cwd(), "crawl-data.json");

  // Load existing crawl data
  let crawlData = null;
  try {
    if (fs.existsSync(crawlFilePath)) {
      const raw = fs.readFileSync(crawlFilePath, "utf-8");
      crawlData = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading crawl file:", err);
  }

  // Check if crawl data exists and is recent (less than 24h old)
  const needsRefresh = !crawlData || !crawlData.lastCrawl || (new Date() - new Date(crawlData.lastCrawl)) > 24 * 60 * 60 * 1000;

  if (needsRefresh) {
    try {
      console.log("Triggering progressive crawl...");
      // Call your serverless progressive-crawl endpoint
      await fetch(`https://shelldon-vercel.vercel.app/api/progressive-crawl?secret=${process.env.CRAWL_SECRET}`);
      // Reload crawlData after crawl
      const raw = fs.readFileSync(crawlFilePath, "utf-8");
      crawlData = JSON.parse(raw);
    } catch (err) {
      console.error("Error during auto-refresh crawl:", err);
      return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
    }
  }

  // Construct OpenAI payload
  const openAiPayload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Shelldon, assistant for http://51294e-8f.myshopify.com. Answer ONLY based on this site data: ${JSON.stringify(crawlData)}`
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(openAiPayload)
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Shelldon couldn’t get a response right now.";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Shelldon OpenAI error:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
