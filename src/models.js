import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ------------------------------ Admin ------------------------------ */
const adminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  nickname: { type: String, required: true, trim: true },
  role: { type: String, enum: ["owner", "admin"], default: "admin" },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });
export const Admin = model("Admin", adminSchema);

/* ----------------------------- Product ----------------------------- */
const productSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, default: "AI Tools", trim: true },
  icon: { type: String, default: "✨" },
  logoUrl: { type: String, default: "" },
  badge: { type: String, default: "" },                    // e.g. "Best Seller", "-30%"
  shortDescription: { type: String, default: "" },
  description: { type: String, default: "" },
  features: [{ type: String }],
  deliveryMethod: { type: String, default: "Account email + password on your order page after approval." },
  terms: { type: String, default: "" },
  // Multi-region pricing
  priceBDT: { type: Number, default: 0 },
  pricePKR: { type: Number, default: 0 },
  priceUSD: { type: Number, default: 0 },
  originalBDT: { type: Number, default: 0 },
  originalPKR: { type: Number, default: 0 },
  originalUSD: { type: Number, default: 0 },
  sortOrder: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
export const Product = model("Product", productSchema);

/* ---------------------------- Stock item ---------------------------- */
const stockSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  email: { type: String, default: "" },
  password: { type: String, default: "" },
  extra: { type: String, default: "" },                    // 2FA key, profile pin, notes…
  instructions: { type: String, default: "" },
  status: { type: String, enum: ["available", "delivered"], default: "available", index: true },
  addedBy: { type: String, default: "" },
}, { timestamps: true });
export const StockItem = model("StockItem", stockSchema);

/* ------------------------------ Order ------------------------------ */
const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  snapshot: {
    title: String,
    icon: String,
    currency: { type: String, enum: ["BDT", "PKR", "USD"], default: "USD" },
    region: { type: String, enum: ["bd", "pk", "world"], default: "world" },
    listPrice: { type: Number, default: 0 },               // before discount
    amount: { type: Number, default: 0 },                  // charged
  },
  customer: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    contact: { type: String, default: "" },
  },
  gateway: { type: String, enum: ["bangladesh", "pakistan", "binance"], required: true },
  channel: { type: String, default: "" },                  // bKash / Nagad / Easypaisa / …
  transactionId: { type: String, required: true, trim: true },
  customerRef: { type: String, default: "" },
  promoCode: { type: String, default: "" },
  promoDiscount: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "approved", "delivered", "rejected"], default: "pending", index: true },
  accessTokenHash: { type: String, required: true },
  stockItemId: { type: Schema.Types.ObjectId, ref: "StockItem", default: null },
  timeline: [{
    at: { type: Date, default: Date.now },
    status: String,
    by: String,
    note: String,
  }],
  rejectReason: { type: String, default: "" },
  ip: String,
  userAgent: String,
}, { timestamps: true });
orderSchema.index({ transactionId: 1, gateway: 1 }, { unique: true });
orderSchema.index({ "customer.email": 1, createdAt: -1 });
export const Order = model("Order", orderSchema);

/* ---------------------------- Promo code ---------------------------- */
const promoSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  note: { type: String, default: "" },
  discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
  percentOff: { type: Number, default: 0 },
  fixedBDT: { type: Number, default: 0 },
  fixedPKR: { type: Number, default: 0 },
  fixedUSD: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 },                   // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  minBDT: { type: Number, default: 0 },
  minPKR: { type: Number, default: 0 },
  minUSD: { type: Number, default: 0 },
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: "" },
}, { timestamps: true });

promoSchema.methods.discountFor = function (amount, region) {
  if (this.discountType === "percent") {
    return Math.min(amount, Math.round(amount * this.percentOff) / 100);
  }
  const fixed = region === "bd" ? this.fixedBDT : region === "pk" ? this.fixedPKR : this.fixedUSD;
  return Math.min(amount, Number(fixed || 0));
};
export function promoProblem(promo, { amount, region, productId }) {
  const now = new Date();
  if (!promo || !promo.isActive) return "This promo code is not valid.";
  if (promo.startsAt && now < promo.startsAt) return "This promo code is not active yet.";
  if (promo.expiresAt && now > promo.expiresAt) return "This promo code has expired.";
  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) return "This promo code has reached its usage limit.";
  if (promo.productIds?.length && productId &&
      !promo.productIds.some((id) => String(id) === String(productId))) {
    return "This promo code does not apply to this product.";
  }
  const min = region === "bd" ? promo.minBDT : region === "pk" ? promo.minPKR : promo.minUSD;
  if (min > 0 && amount < min) return `Minimum order amount for this code is ${min}.`;
  return null;
}
export const PromoCode = model("PromoCode", promoSchema);

/* ------------------------------ Review ------------------------------ */
const reviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  name: { type: String, required: true, trim: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, default: "", trim: true },
  status: { type: String, enum: ["pending", "approved"], default: "pending", index: true },
}, { timestamps: true });
export const Review = model("Review", reviewSchema);

/* ----------------------- Site settings (singleton) ----------------------- */
const settingsSchema = new Schema({
  key: { type: String, default: "main", unique: true },
  brand: {
    name: { type: String, default: "AIMarket" },
    accent: { type: String, default: "AI" },              // colored part of the logo
    tagline: { type: String, default: "Premium AI, delivered fast." },
    description: { type: String, default: "Buy premium AI subscriptions — verified accounts, instant delivery, real support." },
  },
  announcement: {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: "" },
  },
  support: {
    whatsappBD: { type: String, default: "" },            // full number e.g. 8801XXXXXXXXX
    whatsappPK: { type: String, default: "" },
    telegram: { type: String, default: "" },
  },
  payment: {
    bangladesh: { bkash: { type: String, default: "" }, nagad: { type: String, default: "" }, instructions: { type: String, default: "Send Money only. Save the TrxID." }, enabled: { type: Boolean, default: true } },
    pakistan: { easypaisa: { type: String, default: "" }, jazzcash: { type: String, default: "" }, bank: { type: String, default: "" }, instructions: { type: String, default: "" }, enabled: { type: Boolean, default: true } },
    binance: { payId: { type: String, default: "" }, walletTRC20: { type: String, default: "" }, walletBEP20: { type: String, default: "" }, instructions: { type: String, default: "" }, enabled: { type: Boolean, default: true } },
  },
  faqs: [{ q: String, a: String, qBn: String, aBn: String }],
  hero: {
    line1: { type: String, default: "Premium AI tools." },
    line2: { type: String, default: "Real accounts, fair prices." },
    sub: { type: String, default: "Hand-verified before sale, delivered to your order page, backed by real humans on WhatsApp." },
  },
  stats: {
    orders: { type: String, default: "12,000+" },
    deliveryTime: { type: String, default: "under 1 hour" },
    rating: { type: String, default: "4.9/5" },
  },
}, { timestamps: true });
export const Settings = model("Settings", settingsSchema);

export async function getSettings() {
  let s = await Settings.findOne({ key: "main" });
  if (!s) s = await Settings.create({ key: "main" });
  return s;
}

/* ---------------------------- Activity log ---------------------------- */
const activitySchema = new Schema({
  actor: { type: String, default: "system" },
  action: { type: String, required: true },
  message: { type: String, default: "" },
}, { timestamps: true });
export const Activity = model("Activity", activitySchema);

export async function logActivity(actor, action, message) {
  try { await Activity.create({ actor, action, message }); } catch { /* non-fatal */ }
}
