/* Render / VPS / local entry — long-running server */
import { app, ensureReady } from "./src/app.js";

const PORT = process.env.PORT || 10000;
ensureReady()
  .then(() => app.listen(PORT, () => console.log(`🚀 AIMarket Pro running on port ${PORT} (storefront + /admin + /api)`)))
  .catch((err) => { console.error("Startup failed:", err.message); process.exit(1); });
