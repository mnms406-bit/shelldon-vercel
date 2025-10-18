import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    console.log("🚀 Progressive crawl started...");

    // Replace this URL with your Shopify Storefront or sitemap URL
    const targetURL = "http://51294e-8f.myshopify.com/collections/all?view=json";

    // Example fetch (you can customize this for your own structure)
    const response = await fetch(targetURL);
    if (!response.ok) throw new Error(`Failed to fetch ${targetURL}: ${response.status}`);
    const crawlData = await response.json();

    // ✅ Save crawl data persistently to /public
    const savePath = path.join(process.cwd(), "public", "crawl-data.json");
    fs.writeFileSync(savePath, JSON.stringify(crawlData, null, 2));
    console.log("✅ Crawl data saved to:", savePath);

    // Return a success response
    res.status(200).json({
      status: "success",
      message: "Progressive crawl completed successfully",
      data: { file: "/api/get-crawl" }
    });
  } catch (err) {
    console.error("❌ Progressive crawl failed:", err);
    res.status(500).json({
      status: "error",
      message: "Crawl failed",
      details: err.message
    });
  }
}
