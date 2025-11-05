import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const repo = "mnms406-bit/shelldon-vercel";
    const token = process.env.GITHUB_TOKEN;

    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/crawl-data.json`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 404) {
      return res.status(404).json({ error: "No crawl data found yet." });
    }

    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    res.status(200).json(JSON.parse(decoded));
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ error: err.message });
  }
}
