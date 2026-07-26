import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "./models.js";
import { publicRouter } from "./routes.public.js";
import { adminRouter } from "./routes.admin.js";
import { errorHandler } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true }));
app.use(express.json({ limit: "300kb" }));

app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
const orderLimiter = rateLimit({ windowMs: 60_000, limit: 8 });
app.use("/api/orders", (req, res, next) => (req.method === "POST" ? orderLimiter(req, res, next) : next()));
app.use("/api/admin/login", rateLimit({ windowMs: 10 * 60_000, limit: 15 }));

app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

/* -------- Storefront + admin panel (no build step, plain static) -------- */
const pub = path.join(__dirname, "..", "public");
app.use(express.static(pub, { maxAge: "1h", index: "index.html" }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(pub, "index.html")));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

/* ------------- Connection + first-admin seed (cached, serverless-safe) ------------- */
let readyPromise = null;
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI env var is required.");
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET env var is required.");
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
      }
      await seedAdmin();
    })().catch((err) => { readyPromise = null; throw err; });
  }
  return readyPromise;
}

async function seedAdmin() {
  const count = await Admin.countDocuments({});
  if (count > 0) return;
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 10) {
    console.log("⚠️  No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) env vars to auto-create the first owner.");
    return;
  }
  await Admin.create({
    email,
    nickname: process.env.ADMIN_NICKNAME || "Owner",
    role: "owner",
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log(`✅ First owner admin created: ${email}`);
}
