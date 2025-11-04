export default async function handler(req, res) {
  try {
    const { GITHUB_TOKEN, GITHUB_REPO, CRAWL_PATH } = process.env;

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CRAWL_PATH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) return res.status(404).json({ error: "No crawl data found yet." });

    const file = await response.json();
    const content = Buffer.from(file.content, "base64").toString("utf-8");

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(content);

  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ error: err.message });
  }
}
