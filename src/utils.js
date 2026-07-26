import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Admin } from "./models.js";

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString("hex");

export function createOrderId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `AM-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/* ------------------------------ Pricing ------------------------------ */
export const GATEWAY_REGION = { bangladesh: "bd", pakistan: "pk", binance: "world" };
export const REGION_CURRENCY = { bd: "BDT", pk: "PKR", world: "USD" };

export function priceFor(product, region) {
  const amount = region === "bd" ? product.priceBDT : region === "pk" ? product.pricePKR : product.priceUSD;
  const original = region === "bd" ? product.originalBDT : region === "pk" ? product.originalPKR : product.originalUSD;
  return { amount: Number(amount || 0), original: Number(original || 0), currency: REGION_CURRENCY[region] || "USD", region };
}

export function allowedGateways(region, paymentSettings) {
  const list = region === "bd" ? ["bangladesh"] : region === "pk" ? ["pakistan", "binance"] : ["binance", "pakistan"];
  if (!paymentSettings) return list;
  return list.filter((g) => paymentSettings[g]?.enabled !== false);
}

export function normalizeRegion(v) {
  return ["bd", "pk", "world"].includes(v) ? v : "world";
}

/* ------------------------- Tiny validators ------------------------- */
export function reqStr(v, name, { min = 1, max = 200 } = {}) {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) {
    const e = new Error(`${name} is required (${min}–${max} characters).`);
    e.status = 400; throw e;
  }
  return v.trim();
}
export function optStr(v, max = 500) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
export function reqEmail(v) {
  const s = reqStr(v, "Email", { min: 5, max: 160 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) { const e = new Error("A valid email is required."); e.status = 400; throw e; }
  return s;
}
export function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; }
export function isObjectId(v) { return /^[a-f\d]{24}$/i.test(String(v || "")); }

/* ------------------------------- Auth ------------------------------- */
export function signAdminToken(admin) {
  return jwt.sign({ id: admin._id.toString(), role: admin.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export const requireAdmin = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Login required." });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: "Session expired. Please login again." }); }
  const admin = await Admin.findById(payload.id);
  if (!admin || !admin.isActive) return res.status(401).json({ error: "Account disabled." });
  req.admin = admin;
  next();
});

export function requireOwner(req, res, next) {
  if (req.admin?.role !== "owner") return res.status(403).json({ error: "Owner access only." });
  next();
}

/* --------------------------- Error handler --------------------------- */
export function errorHandler(err, req, res, _next) {
  if (err?.code === 11000) {
    return res.status(409).json({ error: "This value already exists (duplicate)." });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.status ? err.message : "Server error. Please try again." });
}
