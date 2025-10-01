// /api/refresh-crawl.js
export default async function handler(req, res) {
  // allow both GET (browser click) and POST (cron) for convenience
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    // pick base URL from many possible env names; fallback to your Vercel URL
    const envBase =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    const fallback = "https://shelldon-vercel.vercel.app"; // <- change this only if your deployment domain is different
    const baseUrl = envBase || fallback;

    // Optional secret support (if you have one set)
    const secret = process.env.CRAWL_SECRET || process.env.CRON_SECRET || "";

    const progressivePath = "/api/progressive-crawl";
    const url = secret
      ? `${baseUrl}${progressivePath}?secret=${encodeURIComponent(secret)}`
      : `${baseUrl}${progressivePath}`;

    // Use POST to trigger the progressive crawl (cron usually uses POST); adjust if your progressive expects GET
    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
      // include response body for easier debugging
      let bodyText;
      try { bodyText = await response.text(); } catch (e) { bodyText = "<unable to read body>"; }
      throw new Error(`Crawl request failed: ${response.status} ${response.statusText} - ${bodyText}`);
    }

    const data = await response.json().catch(() => null);
    return res.status(200).json({ status: "success", message: "Manual crawl triggered", data });
  } catch (error) {
    console.error("refresh-crawl error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to refresh crawl.",
      details: error.message,
    });
  }
}
