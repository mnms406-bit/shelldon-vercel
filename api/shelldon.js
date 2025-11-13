// api/shelldon.js
export default async function handler(req, res) {
  // Allow frontend domain
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message)
    return res.status(400).json({ reply: "Please provide a message." });

  try {
    // 🧠 Fetch the crawl data from GitHub
    const crawlResponse = await fetch(
      "https://raw.githubusercontent.com/mnms406-bit/shelldon-vercel/main/data/crawl-data.json"
    );
    const crawlData = await crawlResponse.json();

    // Combine all relevant data into a condensed context string
    const context = `
      PRODUCTS:
      ${crawlData.products
        ?.map(p => `• ${p.title}: ${p.description?.slice(0, 150) || "No description"}`)
        .join("\n")}

      COLLECTIONS:
      ${crawlData.collections
        ?.map(c => `• ${c.title}: ${c.description?.slice(0, 150) || "No description"}`)
        .join("\n")}

      PAGES:
      ${crawlData.pages
        ?.map(pg => `• ${pg.title}: ${pg.body?.slice(0, 150) || "No description"}`)
        .join("\n")}
    `;

    // 🔮 Send the crawl data as context to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              You are Shelldon, the virtual assistant for the Shopify store at https://enajif.com.
              Use the following crawl data as your source of truth for product names, descriptions, collections, and pages.
              
              IMPORTANT RULES:
              - If the user asks about pricing, costs, or price quotes, reply:
                "Due to fluctuations in pricing, we can’t provide a stable cost, but you can find the most accurate and current pricing directly on our website."
              - If the user mentions special quotes, custom pricing, or bulk orders, reply:
                "We can definitely help with that! Please email us at support@enajif.com for personalized quotes or special pricing."
              - Always stay helpful, friendly, and concise.
              - Use the provided context to answer accurately about the store, products, and information.

              CONTEXT:
              ${context}
            `,
          },
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
    res
      .status(200)
      .json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
