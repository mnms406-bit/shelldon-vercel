// /api/refresh-crawl.js
export default async function handler(req, res) {
  try {
    // Fallback base URL: use env if available, otherwise hardcode your Vercel URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://shelldon-vercel.vercel.app";

    const response = await fetch(`${baseUrl}/api/progressive-crawl`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Crawl request failed: ${response.statusText}`);
    }

    const data = await response.json();

    res.status(200).json({
      status: "success",
      message: "Crawl triggered successfully.",
      data,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to refresh crawl.",
      details: error.message,
    });
  }
}
