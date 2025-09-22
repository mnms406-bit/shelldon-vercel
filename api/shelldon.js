// Shelldon Vercel Serverless Function
// Uses native fetch (no node-fetch needed)

const SHOPIFY_STORE = "51294e-8f.myshopify.com"; // your Shopify store
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN; // Shopify Admin API token
const OPENAI_KEY = process.env.OPENAI_API_KEY; // OpenAI API key

export default async function handler(req, res) {
  const message = req.query.message || "";

  if (!message) {
    return res.status(200).json({ reply: "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!" });
  }

  try {
    // 1️⃣ Fetch basic Shopify products (example, 5 items)
    const shopifyRes = await fetch(`https://${SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=5`, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    });

    let productText = "";
    if (shopifyRes.ok) {
      const data = await shopifyRes.json();
      if (data.products && data.products.length > 0) {
        productText = data.products.map(p => p.title).join(", ");
      }
    } else {
      productText = "Could not fetch Shopify products.";
    }

    // 2️⃣ Ask OpenAI for a response based on the user message and products
    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: `You are Shelldon, a virtual assistant for the Shopify store ${SHOPIFY_STORE}. Products available: ${productText}.` },
          { role: "user", content: message }
        ],
        max_tokens: 300,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      console.error("OpenAI error:", errText);
      return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
    }

    const aiData = await openAiRes.json();
    const aiReply = aiData.choices?.[0]?.message?.content || "Shelldon couldn’t get a response right now.";

    return res.status(200).json({ reply: aiReply });

  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
