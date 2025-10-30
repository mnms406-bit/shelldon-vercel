import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION,
});

export default async function handler(req, res) {
  try {
    const data = await s3
      .getObject({
        Bucket: process.env.CRAWL_BUCKET,
        Key: "crawl-data.json",
      })
      .promise();

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(data.Body.toString("utf-8"));
  } catch (err) {
    console.error("Get crawl failed:", err);
    res.status(404).json({ error: "No crawl data found yet." });
  }
}
