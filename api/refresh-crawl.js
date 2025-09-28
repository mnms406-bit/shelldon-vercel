export default async function handler(req, res) {
  try {
    // Call your progressive crawler endpoint directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/progressive-crawl`, {
      headers: {
        "Authorization": `Bearer ${process.env.CRAWL_SECRET || ""}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: "error",
        message: data.message || "progressive-crawl failed",
        details: data
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Manual crawl triggered successfully",
      result: data
    });

  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      stack: err.stack
    });
  }
}
