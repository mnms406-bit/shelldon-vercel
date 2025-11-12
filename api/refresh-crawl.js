import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const progressiveURL = `${process.env.VERCEL_URL}/api/progressive-crawl`;
    const response = await fetch(`https://${progressiveURL}`);
    const data = await response.json();

    if (data.status === "success") {
      res.status(200).json({ status: "success", message: "Manual crawl triggered", data });
    } else {
      res.status(500).json({ status: "error", message: "Crawl failed", details: data });
    }
  } catch (err) {
    console.error("Refresh crawl error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
