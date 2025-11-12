// api/shelldon.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  try {
    const crawlResponse = await fetch(
      "https://raw.githubusercontent.com/mnms406-bit/shelldon-vercel/main/data/crawl-data.json"
    );
    const crawlData = await crawlResponse.json();

    // Build context including prices
    const context = `
PRODUCTS:
${crawlData.products?.map(p => {
  const variants = p.variants?.map(v => {
    if (v?.priceV2?.amount) {
      return `${v.title}: $${parseFloat(v.priceV2.amount).toFixed(2)} USD`;
    }
    return v.title ? `${v.title}: Price unavailable` : null;
  }).filter(Boolean).join(", ");
  return `• ${p.title}: ${p.description?.slice(0,150) || "No description"} | Variants: ${variants}`;
}).join("\n")}

COLLECTIONS:
${crawlData.collections?.map(c => `• ${c.title}: ${c.description?.slice(0,150) || "No description"}`).join("\n")}

PAGES:
${crawlData.pages?.map(pg => `• ${pg.title}: ${pg.body?.slice(0,150) || "No description"}`).join("\n")}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are Shelldon, the virtual assistant for https://enajif.com. Use this crawl data for all answers:\n${context}` },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Shelldon couldn’t get a response right now.";
    res.status(200).json({ reply });

  } catch (err) {
    console.error("Shelldon error:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
