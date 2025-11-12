// api/shelldon.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message)
    return res.status(400).json({ reply: "Please provide a message." });

  try {
    // Fetch the crawl data from GitHub
    const crawlResponse = await fetch(
      "https://raw.githubusercontent.com/mnms406-bit/shelldon-vercel/main/data/crawl-data.json"
    );
    const crawlData = await crawlResponse.json();

    // Convert crawl into a structured context including variants and prices
    const context = crawlData.products?.map(p => {
      const variants = p.variants?.map(v => {
        const price = v.priceV2 ? `$${parseFloat(v.priceV2.amount).toFixed(2)} ${v.priceV2.currencyCode}` : "N/A";
        return `• Variant: ${v.title} — Price: ${price}`;
      }).join("\n") || "• No variants";
      return `Product: ${p.title}\nDescription: ${p.description || "No description"}\n${variants}`;
    }).join("\n\n") || "No products available.";

    const collectionsContext = crawlData.collections?.map(c => `• ${c.title}: ${c.description || "No description"}`).join("\n") || "No collections.";
    const pagesContext = crawlData.pages?.map(pg => `• ${pg.title}: ${pg.body || "No description"}`).join("\n") || "No pages.";

    const fullContext = `
PRODUCTS:
${context}

COLLECTIONS:
${collectionsContext}

PAGES:
${pagesContext}
    `;

    // Send to OpenAI
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
You are Shelldon, the virtual assistant for https://enajif.com.
Use the following crawl data as your source of truth for product, page, pricing, and collection information.
Always provide prices nicely formatted in USD.
Context:
${fullContext}
            `,
          },
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
    console.error("Shelldon serverless error:", err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
};
