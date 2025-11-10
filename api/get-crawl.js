import fetch from "node-fetch";

export default async function handler(req, res) {
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = "mnms406-bit/shelldon-vercel";
  const path = "crawl-data.json";

  if (!githubToken) {
    return res.status(400).json({ status: "error", message: "Missing GitHub token." });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${githubToken}` },
    });

    const data = await response.json();
    if (!data.content) {
      return res.status(404).json({ status: "error", message: "No crawl data found yet." });
    }

    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    res.status(200).json(JSON.parse(decoded));
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
