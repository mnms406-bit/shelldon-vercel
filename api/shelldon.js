// Vercel-compatible serverless function
export default async function handler(req, res) {
  const message = req.query.message || "";

  // Default greeting
  let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier.";

  // OpenAI API
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
        temperature: 0.7
      })
    });

    if(!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI API error:", errorText);
      return res.status(500).json({ reply: "Shelldon crashed: OpenAI API error." });
    }

    const data = await openaiRes.json();
    if(data.choices && data.choices.length > 0) {
      reply = data.choices[0].message.content;
    }
  } catch(err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ reply: "Shelldon couldn’t get a response right now." });
  }

  // Optional Shopify fetch (comment out if only OpenAI)
  /*
  try {
    const shopifyRes = await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=5`, {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_API_TOKEN,
        "Content-Type": "application/json"
      }
    });
    if(shopifyRes.ok) {
      const shopifyData = await shopifyRes.json();
      if(shopifyData.products && shopifyData.products.length > 0) {
        reply += `\nFirst product: ${shopifyData.products[0].title}`;
      }
    }
  } catch(err) {
    console.error("Shopify fetch error:", err);
  }
  */

  res.status(200).json({ reply });
}
