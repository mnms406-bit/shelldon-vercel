import fetch from "node-fetch";

const STORE_DOMAIN = "51294e-8f.myshopify.com";
const CHUNK_SIZE = 20; // Number of items per batch
const CACHE_PREFIX = "crawl_data_"; // Keys for local JSON storage (or replace with your DB)

async function fetchIncremental(endpoint, lastTimestamp) {
  let page = 1;
  let more = true;
  const items = [];

  while (more) {
    let url = `https://${STORE_DOMAIN}/admin/api/2023-10${endpoint}&limit=${CHUNK_SIZE}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();

    const key = Object.keys(data)[0]; // products, collections, pages
    if (data[key] && data[key].length > 0) {
      // Filter only new/updated items
      const filtered = data[key].filter(item => {
        const updated = item.updated_at || item.created_at;
        return !lastTimestamp[key] || new Date(updated) > new Date(lastTimestamp[key]);
      });

      items.push(...filtered);
      page++;
    } else {
      more = false;
    }
  }

  return items;
}

export default async function handler(req, res) {
  try {
    // Load last timestamps (simulate with in-memory object, replace with DB if needed)
    let lastTimestamp = {}; // { products: ISOString, collections: ISOString, pages: ISOString }

    const endpoints = [
      `/products.json?published_status=published`,
      `/collections.json`,
      `/pages.json`
    ];

    const allData = {};

    for (const endpoint of endpoints) {
      const key = endpoint.split(".")[0].replace("/", ""); // products, collections, pages
      const newItems = await fetchIncremental(endpoint, lastTimestamp);

      if (!allData[key]) allData[key] = { timestamp: new Date().toISOString(), items: [] };
      allData[key].items.push(...newItems);

      // Update lastTimestamp to latest updated_at
      if (newItems.length > 0) {
        const latestUpdate = newItems.reduce((latest, item) => {
          const updated = item.updated_at || item.created_at;
          return new Date(updated) > new Date(latest) ? new Date(updated) : latest;
        }, new Date(0));
        lastTimestamp[key] = latestUpdate.toISOString();
      }
    }

    res.status(200).json({ status: "success", data: allData });
  } catch (err) {
    console.error("Incremental crawler error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
