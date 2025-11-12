// api/get-crawl.js
export default async function handler(req, res) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = "mnms406-bit/shelldon-vercel";
  const githubPath = "data/crawl-data.json";

  if (!githubToken) {
    return res.status(400).json({
      status: "error",
      message: "Missing GitHub token.",
    });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3.raw", // returns raw file content
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: "No crawl data found yet." });
      }
      const text = await response.text();
      throw new Error(`GitHub fetch failed: ${text}`);
    }

    const crawlData = await response.json(); // GitHub returns JSON when using raw? Actually raw returns string.
    
    // If using Accept: raw, response.text() returns JSON string
    const data = typeof crawlData === "string" ? JSON.parse(crawlData) : crawlData;

    res.status(200).json(data);
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
