export default async function handler(req, res) {
  // Allow requests from your Shopify domain
  res.setHeader("Access-Control-Allow-Origin", "https://51294e-8f.myshopify.com");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message } = req.query;
    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Shelldon, a helpful shopping assistant for the Shopify store at http://51294e-8f.myshopify.com." },
        { role: "user", content: message }
      ],
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "Shelldon couldn’t get a response right now." });
  }
}
