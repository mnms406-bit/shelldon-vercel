import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const r = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await r.json();
    res.status(200).json({ test: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
