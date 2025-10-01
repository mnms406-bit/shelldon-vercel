// /api/refresh-crawl.js
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    // Resolve base URL (checks many env names, falls back to known domain)
    const envBase =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    const fallback = "https://shelldon-vercel.vercel.app"; // change only if your Vercel domain is different
    const baseUrl = envBase || fallback;

    const progressivePath = "/api/progressive-crawl";

    // Read whichever bypass token you have set (support common names)
    const bypassToken =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
      process.env.VERCEL_BYPASS_TOKEN ||
      process.env.VERCEL_BYPASS ||
      process.env.VERCEL_BYPASS_TOKEN_SECRET ||
      "";

    // Build URL and include bypass param only if token present
    const url = bypassToken
      ? `${baseUrl}${progressivePath}?x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}`
      : `${baseUrl}${progressivePath}`;

    // Trigger the progressive crawl (POST by default)
    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
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
