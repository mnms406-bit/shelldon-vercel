// api/get-crawl.js
import fs from "fs";
import path from "path";
import { latestCrawl } from "./refresh-crawl.js";

export default async function handler(req, res) {
  try {
    const filePath = path.join("/tmp", "crawl-data.json");

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return res.status(200).json(parsed);
    }

    // fallback: check live in-memory variable
    if (latestCrawl) {
      return res.status(200).json(latestCrawl);
    }

    return res.status(404).json({ error: "No crawl data found yet." });
  } catch (err) {
    console.error("get-crawl failed:", err);
    return res.status(500).json({ error: String(err) });
  }
}
