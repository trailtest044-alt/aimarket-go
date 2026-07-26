import express from "express";
import {
  Product, StockItem, Order, Review, PromoCode, promoProblem, getSettings,
} from "./models.js";
import {
  asyncHandler, createOrderId, randomToken, sha256, priceFor, allowedGateways,
  GATEWAY_REGION, normalizeRegion, reqStr, reqEmail, optStr, isObjectId,
} from "./utils.js";

export const publicRouter = express.Router();

/* ------------------------------ Settings ------------------------------ */
publicRouter.get("/settings", asyncHandler(async (req, res) => {
  const s = await getSettings();
  res.json({
    brand: s.brand, announcement: s.announcement, support: s.support,
    hero: s.hero, stats: s.stats, faqs: s.faqs,
    payment: {
      bangladesh: { ...s.payment.bangladesh.toObject?.() ?? s.payment.bangladesh },
      pakistan: { ...s.payment.pakistan.toObject?.() ?? s.payment.pakistan },
      binance: { ...s.payment.binance.toObject?.() ?? s.payment.binance },
    },
  });
}));

/* ------------------------------ Products ------------------------------ */
async function stockCounts(ids) {
  const rows = await StockItem.aggregate([
    { $match: { status: "available", ...(ids ? { productId: { $in: ids } } : {}) } },
    { $group: { _id: "$productId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

async function ratingMap(ids) {
  const rows = await Review.aggregate([
    { $match: { status: "approved", ...(ids ? { productId: { $in: ids } } : {}) } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { avg: Math.round(r.avg * 10) / 10, n: r.n }]));
}

function shape(p, region, stock, rating) {
  return {
    id: String(p._id), slug: p.slug, title: p.title, category: p.category,
    icon: p.icon, logoUrl: p.logoUrl, badge: p.badge,
    shortDescription: p.shortDescription, description: p.description,
    features: p.features, deliveryMethod: p.deliveryMethod, terms: p.terms,
    price: priceFor(p, region),
    pricing: { bd: priceFor(p, "bd"), pk: priceFor(p, "pk"), world: priceFor(p, "world") },
    stock: stock || 0,
    rating: rating || { avg: 0, n: 0 },
  };
}

publicRouter.get("/products", asyncHandler(async (req, res) => {
  const region = normalizeRegion(req.query.region);
  const products = await Product.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
  const ids = products.map((p) => p._id);
  const [stocks, ratings] = await Promise.all([stockCounts(ids), ratingMap(ids)]);
  res.json({
    region,
    products: products.map((p) => shape(p, region, stocks.get(String(p._id)), ratings.get(String(p._id)))),
    categories: [...new Set(products.map((p) => p.category))],
  });
}));

publicRouter.get("/products/:slug", asyncHandler(async (req, res) => {
  const region = normalizeRegion(req.query.region);
  const p = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!p) return res.status(404).json({ error: "Product not found." });
  const [stocks, ratings, reviews] = await Promise.all([
    stockCounts([p._id]), ratingMap([p._id]),
    Review.find({ productId: p._id, status: "approved" }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  res.json({
    product: shape(p, region, stocks.get(String(p._id)), ratings.get(String(p._id))),
    reviews: reviews.map((r) => ({ name: r.name, rating: r.rating, text: r.text, at: r.createdAt })),
  });
}));

/* ------------------------------ Reviews ------------------------------ */
publicRouter.post("/reviews", asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!isObjectId(productId)) return res.status(400).json({ error: "Invalid product." });
  const product = await Product.findById(productId).lean();
  if (!product) return res.status(404).json({ error: "Product not found." });
  const rating = Math.min(5, Math.max(1, Math.round(Number(req.body.rating) || 0)));
  if (!rating) return res.status(400).json({ error: "Rating (1–5) is required." });
  await Review.create({
    productId,
    name: reqStr(req.body.name, "Name", { min: 2, max: 60 }),
    rating,
    text: optStr(req.body.text, 600),
  });
  res.status(201).json({ ok: true, message: "Thanks! Your review will appear after moderation." });
}));

/* ------------------------------- Promo ------------------------------- */
publicRouter.post("/promo/validate", asyncHandler(async (req, res) => {
  const code = reqStr(req.body.code, "Promo code", { min: 2, max: 40 }).toUpperCase();
  const region = normalizeRegion(req.body.region);
  const promo = await PromoCode.findOne({ code });
  if (!promo) return res.status(404).json({ error: "This promo code is not valid." });

  let amount = 0, productId = null;
  if (isObjectId(req.body.productId)) {
    const product = await Product.findOne({ _id: req.body.productId, isActive: true }).lean();
    if (product) { amount = priceFor(product, region).amount; productId = product._id; }
  }
  const problem = promoProblem(promo, { amount, region, productId });
  if (problem) return res.status(400).json({ error: problem });

  const discount = promo.discountFor(amount, region);
  res.json({
    code: promo.code, note: promo.note, discountType: promo.discountType,
    percentOff: promo.percentOff, discount,
    finalAmount: Math.max(0, Math.round((amount - discount) * 100) / 100),
  });
}));

/* ------------------------------- Orders ------------------------------- */
publicRouter.post("/orders", asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!isObjectId(b.productId)) return res.status(400).json({ error: "Invalid product." });
  const product = await Product.findOne({ _id: b.productId, isActive: true });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const available = await StockItem.countDocuments({ productId: product._id, status: "available" });
  if (available <= 0) return res.status(409).json({ error: "This product is out of stock right now." });

  const gateway = ["bangladesh", "pakistan", "binance"].includes(b.gateway) ? b.gateway : null;
  if (!gateway) return res.status(400).json({ error: "Choose a payment gateway." });
  const settings = await getSettings();
  const region = GATEWAY_REGION[gateway];
  if (!allowedGateways(region, settings.payment).includes(gateway) && settings.payment[gateway]?.enabled === false) {
    return res.status(400).json({ error: "This payment gateway is currently disabled." });
  }

  const name = reqStr(b.name, "Name", { min: 2, max: 80 });
  const email = reqEmail(b.email);
  const contact = optStr(b.contact, 60);
  const channel = reqStr(b.channel, "Payment channel", { min: 2, max: 40 });
  const transactionId = reqStr(b.transactionId, "Transaction ID", { min: 4, max: 120 });
  const customerRef = optStr(b.customerRef, 80);

  const dup = await Order.findOne({ transactionId, gateway }).lean();
  if (dup) return res.status(409).json({ error: "This Transaction ID is already submitted. Use Track Order to check its status." });

  const price = priceFor(product, region);

  // Promo (server-side re-check)
  let promo = null, discount = 0;
  if (optStr(b.promoCode, 40)) {
    promo = await PromoCode.findOne({ code: b.promoCode.trim().toUpperCase() });
    const problem = promoProblem(promo, { amount: price.amount, region, productId: product._id });
    if (problem) return res.status(400).json({ error: problem });
    discount = promo.discountFor(price.amount, region);
  }
  const amount = Math.max(0, Math.round((price.amount - discount) * 100) / 100);

  const accessToken = randomToken();
  const order = await Order.create({
    orderId: createOrderId(),
    productId: product._id,
    snapshot: { title: product.title, icon: product.icon, currency: price.currency, region, listPrice: price.amount, amount },
    customer: { name, email, contact },
    gateway, channel, transactionId, customerRef,
    promoCode: promo?.code || "", promoDiscount: discount,
    status: "pending",
    accessTokenHash: sha256(accessToken),
    timeline: [{ status: "pending", by: "customer", note: "Order submitted" }],
    ip: req.ip, userAgent: req.headers["user-agent"] || "",
  });
  if (promo) await PromoCode.updateOne({ _id: promo._id }, { $inc: { usedCount: 1 } });

  res.status(201).json({
    message: "Order submitted. It unlocks after admin approval.",
    order: publicOrder(order),
    accessToken,
  });
}));

function publicOrder(o, delivery = null) {
  return {
    orderId: o.orderId, status: o.status,
    title: o.snapshot?.title, icon: o.snapshot?.icon,
    amount: o.snapshot?.amount, listPrice: o.snapshot?.listPrice,
    currency: o.snapshot?.currency, region: o.snapshot?.region,
    gateway: o.gateway, channel: o.channel,
    transactionId: o.transactionId, customerRef: o.customerRef,
    promoCode: o.promoCode, promoDiscount: o.promoDiscount,
    createdAt: o.createdAt, timeline: o.timeline,
    rejectReason: o.rejectReason || "",
    deliveryReady: ["approved", "delivered"].includes(o.status) && !!o.stockItemId,
    delivery,
  };
}

publicRouter.get("/orders/:orderId", asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ error: "Order not found." });
  const token = String(req.query.token || "");
  const authed = token && sha256(token) === order.accessTokenHash;

  let delivery = null;
  if (authed && ["approved", "delivered"].includes(order.status) && order.stockItemId) {
    const item = await StockItem.findById(order.stockItemId).lean();
    if (item) delivery = { email: item.email, password: item.password, extra: item.extra, instructions: item.instructions };
  }
  const payload = publicOrder(order, delivery);
  if (!authed) { payload.transactionId = mask(payload.transactionId); payload.customerRef = ""; }
  res.json({ order: payload, authed });
}));

const mask = (v) => (v && v.length > 4 ? v.slice(0, 2) + "•••" + v.slice(-2) : "•••");

publicRouter.post("/track", asyncHandler(async (req, res) => {
  const code = reqStr(req.body.code, "Order ID or Transaction ID", { min: 3, max: 160 });
  const exact = new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const orders = await Order.find({ $or: [{ orderId: exact }, { transactionId: exact }, { customerRef: exact }] })
    .sort({ createdAt: -1 }).limit(10);
  res.json({
    results: orders.map((o) => {
      const p = publicOrder(o);
      p.transactionId = mask(p.transactionId);
      p.customerRef = "";
      return p;
    }),
  });
}));
