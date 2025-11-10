import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const githubResponse = await fetch(
      `https://api.github.com/repos/mnms406-bit/shelldon-vercel/contents/crawl-data.json`,
      {
        headers: {
          "Authorization": `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!githubResponse.ok) {
      return res.status(404).json({ error: "No crawl data found yet." });
    }

    const data = await githubResponse.json();
    const content = Buffer.from(data.content, "base64").toString("utf8");

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(content);
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ error: err.message });
  }
}
