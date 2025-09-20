// Vercel-compatible fetch import
// Node 18+ has native fetch, so no need for node-fetch

// Hardcoded Shopify store
const SHOPIFY_STORE = "51294e-8f.myshopify.com";

// Tokens as environment variables
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
    const userMessage = req.query.message || "";

    // Default greeting
    let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

    // Respond to Shopify product queries
    if (/product/i.test(userMessage)) {
        try {
            const shopifyRes = await fetch(
                `https://${SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=5`,
                {
                    headers: {
                        "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!shopifyRes.ok) {
                const errText = await shopifyRes.text();
                console.error("Shopify API error:", errText);
                reply = `Error fetching products from Shopify.`;
            } else {
                const data = await shopifyRes.json();
                if (data.products && data.products.length > 0) {
                    reply = "Here are the first 5 products:\n" + 
                        data.products.map(p => p.title).join("\n");
                } else {
                    reply = "No products found in Shopify store.";
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            reply = "Error fetching products from Shopify.";
        }
    } 
    // Otherwise, use OpenAI for general queries
    else if (userMessage.trim().length > 0) {
        try {
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{ role: "user", content: userMessage }],
                    max_tokens: 150,
                }),
            });

            const data = await openaiRes.json();
            if (data.choices && data.choices[0].message) {
                reply = data.choices[0].message.content;
            } else {
                reply = "Shelldon couldn't generate a response.";
            }
        } catch (err) {
            console.error("OpenAI API error:", err);
            reply = `Shelldon crashed: OpenAI API error.`;
        }
    }

    res.status(200).json({ reply });
}
