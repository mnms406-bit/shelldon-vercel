export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRAWL_SECRET && secret !== "mySuperSecret123!") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Your crawler logic here
    // Example: fetch all pages/products and store/cache
    await runCrawler(); // your existing function
    res.status(200).json({ message: "Crawl completed successfully!" });
  } catch (err) {
    console.error("Crawl error:", err);
    res.status(500).json({ message: "Crawl failed." });
  }
}
