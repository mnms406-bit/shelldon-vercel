export default async function handler(req, res) {
  try {
    const githubResponse = await fetch(
      "https://api.github.com/repos/mnms406-bit/shelldon-vercel/contents/crawl-data.json",
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
        },
      }
    );

    if (!githubResponse.ok) {
      return res.status(404).json({
        error: "Failed to fetch crawl data from GitHub",
        details: await githubResponse.text(),
      });
    }

    const file = await githubResponse.json();
    const decoded = Buffer.from(file.content, "base64").toString("utf8");
    const json = JSON.parse(decoded);

    res.status(200).json(json);
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ error: err.message });
  }
}
