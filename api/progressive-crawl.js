export default async function handler(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== "mySuperSecret123!") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const shopDomain = "http://51294e-8f.myshopify.com";

    // Fetch products
    const productsRes = await fetch(`${shopDomain}/products.json`);
    const productsData = await productsRes.json();

    // Fetch collections
    const collectionsRes = await fetch(`${shopDomain}/collections.json`);
    const collectionsData = await collectionsRes.json();

    // Fetch pages
    const pagesRes = await fetch(`${shopDomain}/pages.json`);
    const pagesData = await pagesRes.json();

    // Combine everything
    const siteContent = {
      products: productsData.products || [],
      collections: collectionsData.collections || [],
      pages: pagesData.pages || []
    };

    // Save to JSON file (requires Vercel KV or temporary storage)
    // For Edge runtime, we can't write to disk persistently.
    // You can use KV or upload to S3/GCS if needed
    // Example: return the data for testing
    return new Response(JSON.stringify({ success: true, siteContent }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Crawler error:", err);
    return new Response(JSON.stringify({ error: "Crawler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
