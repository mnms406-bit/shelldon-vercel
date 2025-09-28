export default async function handler(req, res) {
  // Optional secret to prevent public abuse
  const secret = req.query.secret;
  if (secret !== process.env.CRAWL_SECRET) {
    return res.status(403).json({ status: "error", message: "Unauthorized" });
  }

  try {
    // Call your progressive crawl function
    const crawlRes = await fetch(`${process.env.BASE_URL}/api/progressive-crawl`);
    const data = await crawlRes.json();

    res.status(200).json({ status: "success", message: "Crawl refreshed!", data });
  } catch (err) {
    console.error("Manual crawl refresh error:", err);
    res.status(500).json({ status: "error", message: "Failed to refresh crawl." });
  }
}
