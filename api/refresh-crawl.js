// api/refresh-crawl.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Trigger the progressive crawl endpoint
    const progressiveUrl = `${process.env.VERCEL_URL}/api/progressive-crawl`;

    const response = await fetch(`https://${progressiveUrl}?secret=${process.env.CRAWL_SECRET}`);
    const data = await response.json();

    if (data.status === "success") {
      return res.status(200).json({
        status: "success",
        message: "Progressive crawl triggered successfully.",
        data,
      });
    } else {
      return res.status(500).json({
        status: "error",
        message: "Failed to trigger progressive crawl.",
        data,
      });
    }
  } catch (err) {
    console.error("Refresh crawl failed:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
}
