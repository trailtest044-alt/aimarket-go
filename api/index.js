/* Vercel serverless entry — same Express app, connection cached between invocations */
import { app, ensureReady } from "../src/app.js";

export default async function handler(req, res) {
  try { await ensureReady(); } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Server not configured: " + err.message }));
  }
  return app(req, res);
}
