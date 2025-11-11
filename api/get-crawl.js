import { Octokit } from "@octokit/rest";

const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const githubRepo = "mnms406-bit/shelldon-vercel"; // your repo
const githubBranch = "main"; // branch where crawl is stored
const githubPath = "crawl-data.json"; // file path in repo

if (!githubToken) {
  throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN environment variable.");
}

const octokit = new Octokit({ auth: githubToken });

export default async function handler(req, res) {
  try {
    const { data } = await octokit.repos.getContent({
      owner: githubRepo.split("/")[0],
      repo: githubRepo.split("/")[1],
      path: githubPath,
      ref: githubBranch,
    });

    const content = Buffer.from(data.content, "base64").toString("utf8");
    const crawlData = JSON.parse(content);

    res.setHeader("Content-Type", "application/json");
    res.status(200).json({
      status: "success",
      data: crawlData,
    });
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({
      status: "error",
      message: "No crawl data found yet or failed to fetch from GitHub.",
      details: err.message,
    });
  }
}
