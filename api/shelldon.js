// Vercel-compatible fetch (Node 18+ has built-in fetch)
const fetch = global.fetch;

const SHOPIFY_STORE = "51294e-8f.myshopify.com"; // your public Shopify store
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN; // Shopify Admin API token
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API key

export default async function handler(req, res) {
    const message = req.query.message || "";

    // Default greeting
    let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

    try {
        // Fetch Shopify products
        const shopifyRes = await fetch(
            `https://${SHOPIFY_STORE}/admin/api/2023-10/products.json?limit=5`,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!shopifyRes.ok) {
            console.error("Shopify API error:", await shopifyRes.text());
        } else {
            const data = await shopifyRes.json();
            if (data.products && data.products.length > 0) {
                // Simple matching: if message includes "product", show first 5 product titles
                if (/product/i.test(message)) {
                    const titles = data.products.map(p => p.title).join(", ");
                    reply = `Here are some of our products: ${titles}`;
                    return res.status(200).json({ reply });
                }
            }
        }

        // If Shopify didn’t answer, fallback to OpenAI
        const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are Shelldon, a helpful virtual assistant for Enajif.com." },
                    { role: "user", content: message }
                ],
                max_tokens: 200
            })
        });

        if (openAIResponse.ok) {
            const openAIData = await openAIResponse.json();
            const openAIMessage = openAIData.choices[0]?.message?.content;
            if (openAIMessage) reply = openAIMessage;
        } else {
            const errText = await openAIResponse.text();
            console.error("OpenAI API error:", errText);
            reply = "Shelldon crashed: Could not get a response from OpenAI.";
        }

    } catch (err) {
        console.error("Fetch error:", err);
        reply = "Shelldon crashed: Something went wrong while fetching data.";
    }

    res.status(200).json({ reply });
}
