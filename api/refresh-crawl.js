import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Progressive crawl endpoint
    const crawlResponse = await fetch("https://your-vercel-domain.vercel.app/api/progressive-crawl", {
      method: "GET",
    });

    if (!crawlResponse.ok) {
      return res.status(500).json({ status: "error", message: "Progressive crawl failed", details: await crawlResponse.text() });
    }

    const crawlData = await crawlResponse.json();

    // Save to GitHub
    const githubResponse = await fetch(`https://api.github.com/repos/mnms406-bit/shelldon-vercel/contents/crawl-data.json`, {
      method: "PUT",
      headers: {
        "Authorization": `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update crawl at ${new Date().toISOString()}`,
        content: Buffer.from(JSON.stringify(crawlData, null, 2)).toString("base64"),
      }),
    });

    if (!githubResponse.ok) {
      return res.status(500).json({ status: "error", message: "Failed to save crawl to GitHub", details: await githubResponse.text() });
    }

    res.status(200).json({ status: "success", message: "Crawl completed and saved to GitHub", data: crawlData });
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    res.status(500).json({ status: "error", message: "Refresh crawl failed", details: err.message });
  }
}
