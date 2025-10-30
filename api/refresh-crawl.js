// api/refresh-crawl.js
import progressiveCrawl from "./progressive-crawl.js"; // adjust path if needed
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.CRAWL_SECRET) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  try {
    // Run the crawl
    const crawlData = await progressiveCrawl();

    // Save the crawl data to a JSON file
    const filePath = path.join("/tmp", "crawl-data.json");
    fs.writeFileSync(filePath, JSON.stringify(crawlData, null, 2), "utf8");

    res.status(200).json({
      status: "success",
      message: "Manual crawl triggered",
      counts: {
        products: crawlData.products?.length || 0,
        collections: crawlData.collections?.length || 0,
        pages: crawlData.pages?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Manual crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
