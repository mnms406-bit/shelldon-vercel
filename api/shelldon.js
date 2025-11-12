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
    const crawlResponse = await fetch(
      "https://raw.githubusercontent.com/mnms406-bit/shelldon-vercel/main/data/crawl-data.json"
    );
    const crawlData = await crawlResponse.json();

    // Helper to limit text length
    const truncate = (str, max = 150) => str?.slice(0, max) || "No description";

    const contextProducts = crawlData.products
      ?.map(p => {
        const variantsText = p.variants?.slice(0, 5) // Limit to first 5 variants
          .map(v => {
            if (v?.priceV2?.amount && v?.priceV2?.currencyCode) {
              const amount = parseFloat(v.priceV2.amount).toFixed(2);
              return `${v.title}: $${amount} ${v.priceV2.currencyCode}`;
            }
            return v.title ? `${v.title}: Price unavailable` : null;
          })
          .filter(Boolean)
          .join(", ") || "No variants";

        return `• ${p.title}: ${truncate(p.description)} | Variants: ${variantsText}`;
      })
      .join("\n");

    const contextCollections = crawlData.collections
      ?.map(c => `• ${c.title}: ${truncate(c.description)}`)
      .join("\n");

    const contextPages = crawlData.pages
      ?.map(pg => `• ${pg.title}: ${truncate(pg.body)}`)
      .join("\n");

    // Combine context and trim to ~6000 characters max
    let context = `PRODUCTS:\n${contextProducts}\n\nCOLLECTIONS:\n${contextCollections}\n\nPAGES:\n${contextPages}`;
    if (context.length > 6000) context = context.slice(0, 6000) + "\n...[truncated]";

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
              Use the following crawl data as your source of truth for product, page, pricing, and collection information.
              Be friendly, concise, and helpful. Provide details on tracking, shipping, contact us, and any relevant webpage info.
              Context:
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
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
