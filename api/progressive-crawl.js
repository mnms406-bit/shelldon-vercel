// api/progressive-crawl.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Secret key check
  const auth = req.query.secret;
  if (auth !== process.env.CRAWL_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid secret key" });
  }

  try {
    // Example crawl logic (replace with your actual crawling function)
    const response = await fetch("https://enajif.com");
    const html = await response.text();

    // TODO: Process HTML and store in Vercel KV / DB for Shelldon
    console.log("Crawl completed at:", new Date().toISOString());

    res.status(200).json({ message: "Crawl successful", length: html.length });
  } catch (err) {
    console.error("Crawl error:", err);
    res.status(500).json({ error: "Crawl failed" });
  }
}
