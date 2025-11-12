export default async function handler(req, res) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = "mnms406-bit/shelldon-vercel";
  const githubPath = "data/crawl-data.json";

  try {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubPath}`, {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.statusText}`);

    const json = await response.json();
    const content = Buffer.from(json.content, "base64").toString("utf-8");

    res.status(200).json({
      status: "success",
      data: JSON.parse(content),
    });
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
