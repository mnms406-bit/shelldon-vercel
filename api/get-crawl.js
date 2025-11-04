export default async function handler(req, res) {
  try {
    const repo = process.env.GITHUB_REPO;
    const file = process.env.GITHUB_FILE || "crawl-data.json";
    const token = process.env.GITHUB_TOKEN;

    const apiUrl = `https://api.github.com/repos/${repo}/contents/${file}`;

    const response = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(404).json({ error: "Failed to fetch crawl data", details: text });
    }

    const json = await response.json();
    const decoded = Buffer.from(json.content, "base64").toString("utf8");

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(decoded);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
