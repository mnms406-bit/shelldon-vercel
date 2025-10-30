export default async function handler(req, res) {
  try {
    console.log("✅ Progressive crawl test running...");

    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const key = process.env.SHOPIFY_STOREFRONT_API_KEY;
    const time = new Date().toISOString();

    if (!domain || !key) {
      return res.status(400).json({
        status: "error",
        message: "Missing environment variables",
        domain,
        keyExists: !!key,
      });
    }

    res.status(200).json({
      status: "ok",
      message: "Serverless runtime and env vars working",
      domain,
      time,
    });
  } catch (err) {
    console.error("💥 Crash:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
