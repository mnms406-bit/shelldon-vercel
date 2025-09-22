// api/shelldon.js
export default async function handler(req, res) {
  // Allow your frontend domain
  res.setHeader('Access-Control-Allow-Origin', 'https://enajif.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.query;
  if (!message) return res.status(400).json({ reply: "Please provide a message." });

  try {
    // Fetch Shopify site content
    const shopDomain = '51294e-8f.myshopify.com';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    async function fetchGraphQL(query) {
      const r = await fetch(`https://${shopDomain}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken
        },
        body: JSON.stringify({ query })
      });
      const data = await r.json();
      return data.data;
    }

    const queries = {
      products: `{ products(first:50){ edges{ node{ title description tags } } } }`,
      collections: `{ collections(first:20){ edges{ node{ title description } } } }`,
      pages: `{ pages(first:20){ edges{ node{ title body } } } }`
    };

    const [productsData, collectionsData, pagesData] = await Promise.all([
      fetchGraphQL(queries.products),
      fetchGraphQL(queries.collections),
      fetchGraphQL(queries.pages)
    ]);

    let siteContent = [];

    productsData.products.edges.forEach(e => siteContent.push({ type:'product', title:e.node.title, description:e.node.description }));
    collectionsData.collections.edges.forEach(e => siteContent.push({ type:'collection', title:e.node.title, description:e.node.description }));
    pagesData.pages.edges.forEach(e => siteContent.push({ type:'page', title:e.node.title, description:e.node.body }));

    // Combine site content into chunks to avoid token limits
    const chunkSize = 5;
    let contentChunks = [];
    for (let i = 0; i < siteContent.length; i += chunkSize) {
      contentChunks.push(siteContent.slice(i, i + chunkSize));
    }

    let combinedContent = '';
    contentChunks.forEach(chunk => {
      chunk.forEach(item => {
        combinedContent += `${item.type.toUpperCase()}: ${item.title}\n${item.description}\n\n`;
      });
    });

    // OpenAI request
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages:[
          { role:'system', content:`You are Shelldon, the assistant for Shopify store at http://${shopDomain}. Only answer questions about this store.` },
          { role:'user', content:`Site content:\n${combinedContent}\n\nUser question: ${message}` }
        ],
        temperature:0.7,
        max_tokens:500
      })
    });

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Shelldon couldn’t get a response right now.";

    res.status(200).json({ reply });

  } catch(err) {
    console.error('Shelldon error:', err);
    res.status(200).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
