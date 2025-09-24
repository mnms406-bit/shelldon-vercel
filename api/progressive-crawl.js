export default async function handler(req, res) {
  // Optional: manual secret trigger
  const secret = req.query.secret;
  if(secret && secret !== process.env.CRAWL_SECRET) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  try {
    // Your progressive crawl code goes here
    // It should scan in chunks, replace old JSON, and timestamp each entry
    const result = await progressiveCrawl(); // assume this is your crawler function
    res.status(200).json({ status: "success", data: result });
  } catch(err) {
    console.error("Progressive crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
