// /api/shelldon.js
export default async function handler(req, res) {
  try {
    const { message } = req.query;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Base URL for internal API calls
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://shelldon-vercel.vercel.app";

    // Example: when Shelldon needs fresh data, trigger refresh
    if (message.toLowerCase().includes("refresh crawl")) {
      const crawlRes = await fetch(`${baseUrl}/api/refresh-crawl`);
      const crawlData = await crawlRes.json();

      return res.status(200).json({
        reply: "I’ve refreshed the crawl data for you!",
        crawlStatus: crawlData,
      });
    }

    // Otherwise Shelldon uses cached crawl data (from storage, db, etc.)
    return res.status(200).json({
      reply: `You said: "${message}". (Here is where I’d use the latest crawl data)`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Shelldon failed to respond",
      details: error.message,
    });
  }
}
