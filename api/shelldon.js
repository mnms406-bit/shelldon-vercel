export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://enajif.com"); 
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { message } = req.query;
  if (!message) {
    return res.status(400).json({ reply: "Please provide a message." });
  }

  try {
    // Pull the latest crawl data
    const crawlRes = await fetch(`${process.env.BASE_URL}/api/get-crawl`);
    const crawlData = await crawlRes.json();

    const context = `
      You are Shelldon, the virtual assistant for Enajif.com.
      Use this crawl data to answer customer questions about products, collections, and pages.

      Products: ${JSON.stringify(crawlData.products)}
      Collections: ${JSON.stringify(crawlData.collections)}
      Pages: ${JSON.stringify(crawlData.pages)}
    `;

    // Send to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: context },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ Shelldon couldn’t get a response.";
    res.status(200).json({ reply });

  } catch (err) {
    console.error("Shelldon error:", err);
    res.status(500).json({ reply: "⚠️ Shelldon couldn’t get a response." });
  }
}
