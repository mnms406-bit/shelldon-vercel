// Shelldon Knowledge JS - Modular version

(function() {
  // Elements
  const messagesContainer = document.getElementById('shelldon-chat-messages');
  const inputField = document.getElementById('shelldon-chat-input');

  // Shopify setup
  const shopDomain = 'yourstore.myshopify.com';
  const storefrontToken = 'your-storefront-access-token';

  // OpenAI setup
  const openAiKey = 'YOUR_OPENAI_API_KEY'; // Replace with your key or environment variable reference

  // Typing effect
  function typeMessage(text, from='shelldon', speed=50) {
    let index = 0;
    const msg = document.createElement('div');
    msg.style.marginBottom = '8px';
    msg.style.padding = '6px';
    msg.style.borderRadius = '6px';
    msg.style.maxWidth = '80%';
    msg.style.wordWrap = 'break-word';
    msg.style.display = 'inline-block';
    msg.style.whiteSpace = 'pre-wrap';
    if(from === 'shelldon') {
        msg.style.background = '#f1f1f1';
        msg.style.alignSelf = 'flex-start';
    } else {
        msg.style.background = '#4CAF50';
        msg.style.color = '#fff';
        msg.style.alignSelf = 'flex-end';
    }
    messagesContainer.appendChild(msg);

    const interval = setInterval(() => {
        msg.textContent += text[index];
        index++;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if(index >= text.length) clearInterval(interval);
    }, speed);
  }

  // Fetch Shopify content
  async function fetchShopifyContent() {
    const queries = {
      products: `{ products(first: 5) { edges { node { title description tags } } } }`,
      collections: `{ collections(first: 5) { edges { node { title description } } } }`,
      pages: `{ pages(first: 5) { edges { node { title body } } } }`
    };

    const fetchGraphQL = async (query) => {
      const res = await fetch(`https://${shopDomain}/api/2025-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      return data.data;
    };

    const [productsData, collectionsData, pagesData] = await Promise.all([
      fetchGraphQL(queries.products),
      fetchGraphQL(queries.collections),
      fetchGraphQL(queries.pages)
    ]);

    const siteContent = [];

    productsData.products.edges.forEach(edge => {
        siteContent.push({ type: 'product', title: edge.node.title, description: edge.node.description });
    });
    collectionsData.collections.edges.forEach(edge => {
        siteContent.push({ type: 'collection', title: edge.node.title, description: edge.node.description });
    });
    pagesData.pages.edges.forEach(edge => {
        siteContent.push({ type: 'page', title: edge.node.title, description: edge.node.body });
    });

    return siteContent;
  }

  // Get Shelldon response
  async function getShelldonResponse(userMessage) {
    try {
      const siteContent = await fetchShopifyContent();
      const lowerMsg = userMessage.toLowerCase();

      // Shopify match
      for (const item of siteContent) {
          if ((item.title && item.title.toLowerCase().includes(lowerMsg)) ||
              (item.description && item.description.toLowerCase().includes(lowerMsg))) {
              return `${item.type.toUpperCase()}: ${item.title}\n${item.description}`;
          }
      }

      // OpenAI fallback
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 150
        })
      });

      const aiData = await aiRes.json();
      return aiData.choices && aiData.choices[0].message.content ? aiData.choices[0].message.content : "Sorry, I couldn't generate a response.";
    } catch(err){
      console.error("Shelldon error:", err);
      return "Shelldon crashed: there was an error.";
    }
  }

  // Handle input
  inputField.addEventListener('keydown', async function(event) {
      if(event.key === 'Enter' && inputField.value.trim() !== '') {
          const userMessage = inputField.value.trim();
          typeMessage(userMessage, 'user');
          inputField.value = '';

          const response = await getShelldonResponse(userMessage);
          setTimeout(() => typeMessage(response), 500);
      }
  });

})();
