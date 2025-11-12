// /api/get-crawl.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const repoOwner = "mnms406-bit"; // Your GitHub username
    const repoName = "shelldon-vercel"; // Your repository
    const filePath = "crawl-data.json"; // Path in the repo
    const branch = "main"; // Branch name
    const githubToken = process.env.GITHUB_TOKEN;

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3.raw",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch crawl from GitHub",
        details: text,
      });
    }

    const data = await response.json(); // GitHub raw API returns JSON
    res.status(200).json(data);
  } catch (err) {
    console.error("Get crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
