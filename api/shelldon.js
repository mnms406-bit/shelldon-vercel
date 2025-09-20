// Vercel-compatible fetch import (Node 18+ has native fetch, so no node-fetch needed)
const SHOPIFY_STORE = "51294e-8f.myshopify.com"; // Your Shopify store
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN; // Environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Your OpenAI API key

export default async function handler(req, res) {
    const message = req.query.message || "";

    // Fallback reply
    let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

    try {
        // Fetch products, collections, pages from Shopify Admin API
        const shopifyRes = await fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=5`, {
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                "Content-Type": "application/json",
            },
        });

        if (!shopifyRes.ok) {
            console.error("Shopify API error:", await shopifyRes.text());
            throw new Error("Error fetching products from Shopify.");
        }

        const data = await shopifyRes.json();
        const productList = data.products.map(p => p.title).join(", ");

        // Call OpenAI to generate a response
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are Shelldon, a virtual assistant for a Shopify store. The store has the following products: ${productList}`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 300
            })
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error("OpenAI API error:", errText);
            throw new Error("OpenAI API error.");
        }

        const openaiData = await openaiRes.json();
        reply = openaiData.choices[0].message.content;

    } catch (err) {
        console.error("Shelldon crashed:", err);
        reply = `Shelldon couldn't get a response right now.`;
    }

    res.status(200).json({ reply });
}
