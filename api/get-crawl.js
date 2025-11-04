// api/get-crawl.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const filePath = path.join("/tmp", "crawl-data.json");

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No crawl data found yet." });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("get-crawl failed:", err);
    return res.status(500).json({ error: String(err) });
  }
}
