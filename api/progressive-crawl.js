import fetch from "node-fetch";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION,
});

export default async function handler(req, res) {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.CRAWL_SECRET)
      return res.status(401).json({ error: "Unauthorized" });

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const endpoints = [
      "/admin/api/2023-10/products.json",
      "/admin/api/2023-10/collections.json",
      "/admin/api/2023-10/pages.json",
    ];

    const crawlData = {};

    for (let endpoint of endpoints) {
      const url = `https://${storeDomain}${endpoint}`;
      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_KEY },
      });

      if (!response.ok) {
        crawlData[endpoint] = { errors: await response.text() };
      } else {
        crawlData[endpoint] = await response.json();
      }
    }

    // Upload to S3
    await s3
      .putObject({
        Bucket: process.env.CRAWL_BUCKET,
        Key: "crawl-data.json",
        Body: JSON.stringify({ timestamp: new Date(), data: crawlData }),
        ContentType: "application/json",
      })
      .promise();

    res
      .status(200)
      .json({ status: "success", message: "Crawl uploaded to S3", counts: crawlData });
  } catch (err) {
    console.error("Crawl failed:", err);
    res.status(500).json({ status: "error", message: "Crawl failed", details: err.message });
  }
}
