// Vercel-compatible fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_API_TOKEN = process.env.SHOPIFY_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
    const message = req.query.message || "";

    // Fallback reply
    let reply = "Hi! I’m Shelldon, your virtual assistant. I'm here to help you navigate the site, answer questions, and make your experience easier. Feel free to ask me anything!";

    // Fetch Shopify content
    async function fetchShopifyData() {
        try {
            const [productsRes, collectionsRes, pagesRes] = await Promise.all([
                fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/products.json?limit=10`, {
                    headers: {
                        "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                        "Content-Type": "application/json"
                    }
                }),
                fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/custom_collections.json?limit=5`, {
                    headers: {
                        "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                        "Content-Type": "application/json"
                    }
                }),
                fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/pages.json?limit=5`, {
                    headers: {
                        "X-Shopify-Access-Token": SHOPIFY_API_TOKEN,
                        "Content-Type": "application/json"
                    }
                })
            ]);

            const productsData = await productsRes.json();
            const collectionsData = await collectionsRes.json();
            const pagesData = await pagesRes.json();

            return { productsData, collectionsData, pagesData };
        } catch (err) {
            console.error("Shopify fetch error:", err);
            return null;
        }
    }

    // Call OpenAI to get response
    async function getOpenAIResponse(shopifyData) {
        try {
            const contentSummary = `
Products: ${shopifyData.productsData?.products?.map(p => p.title).join(", ") || "None"}
Collections: ${shopifyData.collectionsData?.custom_collections?.map(c => c.title).join(", ") || "None"}
Pages: ${shopifyData.pagesData?.pages?.map(p => p.title).join(", ") || "None"}
`;
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: `You are Shelldon, a friendly virtual assistant for this Shopify store. Use the following site content to help answer the user:\n${contentSummary}` },
                        { role: "user", content: message }
                    ],
                    temperature: 0.7
                })
            });

            const data = await openaiRes.json();
            return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response right now.";
        } catch (err) {
            console.error("OpenAI fetch error:", err);
            return "Shelldon crashed: OpenAI API error.";
        }
    }

    // Only process if message exists
    if (message.trim() !== "") {
        const shopifyData = await fetchShopifyData();
        reply = await getOpenAIResponse(shopifyData || {});
    }

    res.status(200).json({ reply });
}
