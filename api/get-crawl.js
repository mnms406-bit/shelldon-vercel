import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const filePath = path.join("/tmp", "crawl-data.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No crawl data found yet." });
    }
    const data = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(data);
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(500).json({ error: err.message });
  }
}
