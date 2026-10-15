// Serves the content pages in lib/site.js. vercel.json rewrites each public
// path (e.g. /concept/ohms-law) to /api/site?path=/concept/ohms-law.
import { renderPath } from "../lib/site.js";

export default function handler(req, res) {
  const path = new URL(req.url, "http://x").searchParams.get("path") || "/";
  const page = renderPath(path) ?? renderPath("/concept/__missing__");
  res.statusCode = page.status;
  res.setHeader("Content-Type", page.type);
  res.setHeader("Cache-Control", page.cache);
  res.end(page.body);
}
