export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Call your working progressive-crawl endpoint
    const crawlResponse = await fetch(`${baseUrl}/api/progressive-crawl`);
    const crawlData = await crawlResponse.json();

    if (!crawlData || crawlData.status !== "success") {
      return res.status(500).json({
        status: "error",
        message: "Crawl failed",
        details: crawlData,
      });
    }

    // Upload results to GitHub
    const githubResponse = await fetch(
      "https://api.github.com/repos/mnms406-bit/shelldon-vercel/contents/crawl-data.json",
      {
        method: "PUT",
        headers: {
          Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Auto-update crawl-data.json at ${new Date().toISOString()}`,
          content: Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64"),
        }),
      }
    );

    if (!githubResponse.ok) {
      const err = await githubResponse.text();
      return res.status(500).json({
        status: "error",
        message: "GitHub upload failed",
        details: err,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Crawl completed and uploaded to GitHub",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
