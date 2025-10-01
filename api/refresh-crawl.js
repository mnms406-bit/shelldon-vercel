// /api/refresh-crawl.js
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/progressive-crawl`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Crawl request failed: ${response.statusText}`);
    }

    res.status(200).json({ status: "success", message: "Manual crawl triggered successfully." });
  } catch (error) {
    console.error("Error triggering crawl:", error);
    res.status(500).json({ status: "error", message: "Failed to refresh crawl.", details: error.message });
  }
}
