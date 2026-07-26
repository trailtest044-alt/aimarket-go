import express from "express";
import bcrypt from "bcryptjs";
import {
  Admin, Product, StockItem, Order, PromoCode, Review, Activity, Settings, getSettings, logActivity,
} from "./models.js";
import {
  asyncHandler, requireAdmin, requireOwner, signAdminToken,
  reqStr, reqEmail, optStr, num, isObjectId,
} from "./utils.js";

export const adminRouter = express.Router();

/* -------------------------------- Auth -------------------------------- */
adminRouter.post("/login", asyncHandler(async (req, res) => {
  const email = reqEmail(req.body.email);
  const password = reqStr(req.body.password, "Password", { min: 8, max: 100 });
  const admin = await Admin.findOne({ email });
  if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  await logActivity(admin.nickname, "login", "Logged in");
  res.json({ token: signAdminToken(admin), admin: shapeAdmin(admin) });
}));

const shapeAdmin = (a) => ({ id: String(a._id), email: a.email, nickname: a.nickname, role: a.role, isActive: a.isActive, lastLoginAt: a.lastLoginAt, createdAt: a.createdAt });

adminRouter.use(requireAdmin);

adminRouter.get("/me", (req, res) => res.json({ admin: shapeAdmin(req.admin) }));

adminRouter.patch("/me/password", asyncHandler(async (req, res) => {
  const password = reqStr(req.body.password, "Password", { min: 10, max: 100 });
  req.admin.passwordHash = await bcrypt.hash(password, 12);
  await req.admin.save();
  await logActivity(req.admin.nickname, "password", "Changed own password");
  res.json({ ok: true });
}));

/* ------------------------------ Dashboard ------------------------------ */
adminRouter.get("/dashboard", asyncHandler(async (req, res) => {
  const [pending, approved, delivered, rejected, products, stock] = await Promise.all([
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "approved" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "rejected" }),
    Product.countDocuments({}),
    StockItem.countDocuments({ status: "available" }),
  ]);
  const revenue = await Order.aggregate([
    { $match: { status: { $in: ["approved", "delivered"] } } },
    { $group: { _id: "$snapshot.currency", total: { $sum: "$snapshot.amount" }, n: { $sum: 1 } } },
  ]);
  const topProducts = await Order.aggregate([
    { $match: { status: { $in: ["approved", "delivered"] } } },
    { $group: { _id: "$snapshot.title", sold: { $sum: 1 } } },
    { $sort: { sold: -1 } }, { $limit: 6 },
  ]);
  const lowStockRows = await StockItem.aggregate([
    { $match: { status: "available" } },
    { $group: { _id: "$productId", n: { $sum: 1 } } },
  ]);
  const stockMap = new Map(lowStockRows.map((r) => [String(r._id), r.n]));
  const allProducts = await Product.find({ isActive: true }).select("title").lean();
  const lowStock = allProducts
    .map((p) => ({ title: p.title, available: stockMap.get(String(p._id)) || 0 }))
    .filter((x) => x.available <= 2);
  const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(8).lean();
  const recentActivity = await Activity.find({}).sort({ createdAt: -1 }).limit(12).lean();
  res.json({
    stats: { pending, approved, delivered, rejected, products, stock },
    revenue, topProducts, lowStock,
    recentOrders: recentOrders.map(adminOrder),
    recentActivity,
  });
}));

/* ------------------------------ Products ------------------------------ */
function productInput(b) {
  return {
    title: reqStr(b.title, "Title", { min: 2, max: 120 }),
    slug: reqStr(b.slug, "Slug", { min: 2, max: 140 }).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    category: optStr(b.category, 60) || "AI Tools",
    icon: optStr(b.icon, 10) || "✨",
    logoUrl: optStr(b.logoUrl, 800),
    badge: optStr(b.badge, 40),
    shortDescription: optStr(b.shortDescription, 200),
    description: optStr(b.description, 6000),
    features: Array.isArray(b.features) ? b.features.map((f) => optStr(f, 160)).filter(Boolean).slice(0, 20) : [],
    deliveryMethod: optStr(b.deliveryMethod, 300),
    terms: optStr(b.terms, 2000),
    priceBDT: num(b.priceBDT), pricePKR: num(b.pricePKR), priceUSD: num(b.priceUSD),
    originalBDT: num(b.originalBDT), originalPKR: num(b.originalPKR), originalUSD: num(b.originalUSD),
    sortOrder: num(b.sortOrder, 100),
    isActive: b.isActive !== false,
  };
}

adminRouter.get("/products", asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
  const stockRows = await StockItem.aggregate([
    { $match: { status: "available" } },
    { $group: { _id: "$productId", n: { $sum: 1 } } },
  ]);
  const stockMap = new Map(stockRows.map((r) => [String(r._id), r.n]));
  res.json({ products: products.map((p) => ({ ...p, id: String(p._id), stock: stockMap.get(String(p._id)) || 0 })) });
}));

adminRouter.post("/products", asyncHandler(async (req, res) => {
  const product = await Product.create(productInput(req.body));
  await logActivity(req.admin.nickname, "product.create", `Added product ${product.title}`);
  res.status(201).json({ product });
}));

adminRouter.put("/products/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const product = await Product.findByIdAndUpdate(req.params.id, productInput(req.body), { new: true });
  if (!product) return res.status(404).json({ error: "Product not found." });
  await logActivity(req.admin.nickname, "product.update", `Updated ${product.title}`);
  res.json({ product });
}));

adminRouter.delete("/products/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  await StockItem.deleteMany({ productId: product._id, status: "available" });
  await logActivity(req.admin.nickname, "product.delete", `Deleted ${product.title}`);
  res.json({ ok: true });
}));

/* -------------------------------- Stock -------------------------------- */
adminRouter.get("/stock", asyncHandler(async (req, res) => {
  const filter = {};
  if (isObjectId(req.query.productId)) filter.productId = req.query.productId;
  if (["available", "delivered"].includes(req.query.status)) filter.status = req.query.status;
  const items = await StockItem.find(filter).sort({ createdAt: -1 }).limit(500).populate("productId", "title icon").lean();
  res.json({ items });
}));

adminRouter.post("/stock", asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!isObjectId(productId)) return res.status(400).json({ error: "Choose a product." });
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "Product not found." });
  // Single item OR bulk: lines of "email:password"
  const items = [];
  if (Array.isArray(req.body.bulk) && req.body.bulk.length) {
    for (const line of req.body.bulk.slice(0, 200)) {
      const [email = "", ...rest] = String(line).split(":");
      items.push({ productId, email: email.trim(), password: rest.join(":").trim(), instructions: optStr(req.body.instructions, 2000), addedBy: req.admin.nickname });
    }
  } else {
    items.push({
      productId,
      email: optStr(req.body.email, 160), password: optStr(req.body.password, 160),
      extra: optStr(req.body.extra, 500), instructions: optStr(req.body.instructions, 2000),
      addedBy: req.admin.nickname,
    });
  }
  const created = await StockItem.insertMany(items);
  await logActivity(req.admin.nickname, "stock.add", `Added ${created.length} stock item(s) to ${product.title}`);
  res.status(201).json({ count: created.length });
}));

adminRouter.put("/stock/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const item = await StockItem.findByIdAndUpdate(req.params.id, {
    email: optStr(req.body.email, 160), password: optStr(req.body.password, 160),
    extra: optStr(req.body.extra, 500), instructions: optStr(req.body.instructions, 2000),
  }, { new: true });
  if (!item) return res.status(404).json({ error: "Stock item not found." });
  res.json({ item });
}));

adminRouter.delete("/stock/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const item = await StockItem.findOneAndDelete({ _id: req.params.id, status: "available" });
  if (!item) return res.status(404).json({ error: "Only available (undelivered) items can be deleted." });
  res.json({ ok: true });
}));

/* -------------------------------- Orders -------------------------------- */
function adminOrder(o) {
  return {
    id: String(o._id), orderId: o.orderId, status: o.status,
    title: o.snapshot?.title, icon: o.snapshot?.icon,
    amount: o.snapshot?.amount, listPrice: o.snapshot?.listPrice, currency: o.snapshot?.currency,
    gateway: o.gateway, channel: o.channel,
    transactionId: o.transactionId, customerRef: o.customerRef,
    promoCode: o.promoCode, promoDiscount: o.promoDiscount,
    customer: o.customer, createdAt: o.createdAt, timeline: o.timeline,
    rejectReason: o.rejectReason, stockItemId: o.stockItemId ? String(o.stockItemId) : null,
  };
}

adminRouter.get("/orders", asyncHandler(async (req, res) => {
  const filter = {};
  if (["pending", "approved", "delivered", "rejected"].includes(req.query.status)) filter.status = req.query.status;
  if (optStr(req.query.q, 120)) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderId: rx }, { transactionId: rx }, { "customer.email": rx }, { "customer.name": rx }];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  res.json({ orders: orders.map(adminOrder) });
}));

adminRouter.post("/orders/:id/approve", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.status !== "pending") return res.status(400).json({ error: "Only pending orders can be approved." });

  // Atomically claim one available stock item
  const item = await StockItem.findOneAndUpdate(
    { productId: order.productId, status: "available" },
    { status: "delivered" },
    { new: true, sort: { createdAt: 1 } },
  );
  if (!item) return res.status(409).json({ error: "No stock available — add stock first, then approve." });

  order.status = "approved";
  order.stockItemId = item._id;
  order.timeline.push({ status: "approved", by: req.admin.nickname, note: "Payment verified, account assigned" });
  await order.save();
  await logActivity(req.admin.nickname, "order.approve", `Approved ${order.orderId}`);
  res.json({ order: adminOrder(order) });
}));

adminRouter.post("/orders/:id/deliver", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.status !== "approved") return res.status(400).json({ error: "Only approved orders can be marked delivered." });
  order.status = "delivered";
  order.timeline.push({ status: "delivered", by: req.admin.nickname, note: optStr(req.body.note, 200) });
  await order.save();
  await logActivity(req.admin.nickname, "order.deliver", `Delivered ${order.orderId}`);
  res.json({ order: adminOrder(order) });
}));

adminRouter.post("/orders/:id/reject", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.status !== "pending") return res.status(400).json({ error: "Only pending orders can be rejected." });
  order.status = "rejected";
  order.rejectReason = optStr(req.body.reason, 300) || "Payment could not be verified.";
  order.timeline.push({ status: "rejected", by: req.admin.nickname, note: order.rejectReason });
  await order.save();
  await logActivity(req.admin.nickname, "order.reject", `Rejected ${order.orderId}`);
  res.json({ order: adminOrder(order) });
}));

adminRouter.get("/orders-export.csv", asyncHandler(async (req, res) => {
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(2000).lean();
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["OrderID", "Status", "Product", "Amount", "Currency", "Gateway", "Channel", "TrxID", "Promo", "Discount", "Customer", "Email", "Contact", "CreatedAt"].join(","),
    ...orders.map((o) => [
      o.orderId, o.status, o.snapshot?.title, o.snapshot?.amount, o.snapshot?.currency,
      o.gateway, o.channel, o.transactionId, o.promoCode, o.promoDiscount,
      o.customer?.name, o.customer?.email, o.customer?.contact,
      new Date(o.createdAt).toISOString(),
    ].map(esc).join(",")),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(rows.join("\n"));
}));

/* -------------------------------- Promos -------------------------------- */
function promoInput(b, admin) {
  const code = reqStr(b.code, "Code", { min: 2, max: 40 }).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return {
    code, note: optStr(b.note, 200),
    discountType: b.discountType === "fixed" ? "fixed" : "percent",
    percentOff: Math.min(100, num(b.percentOff)),
    fixedBDT: num(b.fixedBDT), fixedPKR: num(b.fixedPKR), fixedUSD: num(b.fixedUSD),
    maxUses: Math.round(num(b.maxUses)),
    minBDT: num(b.minBDT), minPKR: num(b.minPKR), minUSD: num(b.minUSD),
    productIds: Array.isArray(b.productIds) ? b.productIds.filter(isObjectId) : [],
    startsAt: b.startsAt ? new Date(b.startsAt) : null,
    expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
    isActive: b.isActive !== false,
    ...(admin ? { createdBy: admin.nickname } : {}),
  };
}

adminRouter.get("/promos", asyncHandler(async (req, res) => {
  res.json({ promos: await PromoCode.find({}).sort({ createdAt: -1 }).lean() });
}));
adminRouter.post("/promos", asyncHandler(async (req, res) => {
  const promo = await PromoCode.create(promoInput(req.body, req.admin));
  await logActivity(req.admin.nickname, "promo.create", `Created promo ${promo.code}`);
  res.status(201).json({ promo });
}));
adminRouter.put("/promos/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const promo = await PromoCode.findByIdAndUpdate(req.params.id, promoInput(req.body), { new: true });
  if (!promo) return res.status(404).json({ error: "Promo not found." });
  await logActivity(req.admin.nickname, "promo.update", `Updated promo ${promo.code}`);
  res.json({ promo });
}));
adminRouter.delete("/promos/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const promo = await PromoCode.findByIdAndDelete(req.params.id);
  if (!promo) return res.status(404).json({ error: "Promo not found." });
  await logActivity(req.admin.nickname, "promo.delete", `Deleted promo ${promo.code}`);
  res.json({ ok: true });
}));

/* -------------------------------- Reviews -------------------------------- */
adminRouter.get("/reviews", asyncHandler(async (req, res) => {
  const filter = ["pending", "approved"].includes(req.query.status) ? { status: req.query.status } : {};
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(300).populate("productId", "title icon").lean();
  res.json({ reviews });
}));
adminRouter.patch("/reviews/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status === "approved" ? "approved" : "pending" }, { new: true });
  if (!review) return res.status(404).json({ error: "Review not found." });
  res.json({ review });
}));
adminRouter.delete("/reviews/:id", asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  await Review.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ------------------------------- Settings ------------------------------- */
adminRouter.get("/settings", asyncHandler(async (req, res) => {
  res.json({ settings: await getSettings() });
}));
adminRouter.put("/settings", asyncHandler(async (req, res) => {
  const s = await getSettings();
  const b = req.body || {};
  if (b.brand) Object.assign(s.brand, pickStrings(b.brand, ["name", "accent", "tagline", "description"]));
  if (b.announcement) { s.announcement.enabled = !!b.announcement.enabled; s.announcement.text = optStr(b.announcement.text, 300); }
  if (b.support) Object.assign(s.support, pickStrings(b.support, ["whatsappBD", "whatsappPK", "telegram"]));
  if (b.hero) Object.assign(s.hero, pickStrings(b.hero, ["line1", "line2", "sub"]));
  if (b.stats) Object.assign(s.stats, pickStrings(b.stats, ["orders", "deliveryTime", "rating"]));
  if (b.payment) {
    for (const g of ["bangladesh", "pakistan", "binance"]) {
      if (!b.payment[g]) continue;
      for (const [k, v] of Object.entries(b.payment[g])) {
        if (k === "enabled") s.payment[g].enabled = !!v;
        else if (typeof v === "string" && k in s.payment[g]) s.payment[g][k] = v.trim().slice(0, 2000);
      }
    }
  }
  if (Array.isArray(b.faqs)) {
    s.faqs = b.faqs.slice(0, 30).map((f) => ({
      q: optStr(f.q, 200), a: optStr(f.a, 1200), qBn: optStr(f.qBn, 200), aBn: optStr(f.aBn, 1200),
    })).filter((f) => f.q || f.qBn);
  }
  await s.save();
  await logActivity(req.admin.nickname, "settings", "Updated site settings");
  res.json({ settings: s });
}));
const pickStrings = (obj, keys) => Object.fromEntries(keys.filter((k) => typeof obj[k] === "string").map((k) => [k, obj[k].trim().slice(0, 1200)]));

/* ---------------------------- Admin users (owner) ---------------------------- */
adminRouter.get("/admins", requireOwner, asyncHandler(async (req, res) => {
  const admins = await Admin.find({}).sort({ createdAt: 1 }).lean();
  res.json({ admins: admins.map((a) => shapeAdmin(a)) });
}));
adminRouter.post("/admins", requireOwner, asyncHandler(async (req, res) => {
  const email = reqEmail(req.body.email);
  const password = reqStr(req.body.password, "Password", { min: 10, max: 100 });
  const nickname = reqStr(req.body.nickname, "Nickname", { min: 2, max: 40 });
  const admin = await Admin.create({
    email, nickname,
    role: req.body.role === "owner" ? "owner" : "admin",
    passwordHash: await bcrypt.hash(password, 12),
  });
  await logActivity(req.admin.nickname, "admin.create", `Created admin ${nickname}`);
  res.status(201).json({ admin: shapeAdmin(admin) });
}));
adminRouter.patch("/admins/:id/status", requireOwner, asyncHandler(async (req, res) => {
  if (String(req.admin._id) === req.params.id) return res.status(400).json({ error: "You cannot disable yourself." });
  const admin = await Admin.findByIdAndUpdate(req.params.id, { isActive: !!req.body.isActive }, { new: true });
  if (!admin) return res.status(404).json({ error: "Admin not found." });
  await logActivity(req.admin.nickname, "admin.status", `${admin.isActive ? "Enabled" : "Disabled"} ${admin.nickname}`);
  res.json({ admin: shapeAdmin(admin) });
}));
adminRouter.patch("/admins/:id/password", requireOwner, asyncHandler(async (req, res) => {
  const password = reqStr(req.body.password, "Password", { min: 10, max: 100 });
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ error: "Admin not found." });
  admin.passwordHash = await bcrypt.hash(password, 12);
  await admin.save();
  await logActivity(req.admin.nickname, "admin.password", `Reset password for ${admin.nickname}`);
  res.json({ ok: true });
}));

/* ------------------------------- Activity ------------------------------- */
adminRouter.get("/activity", asyncHandler(async (req, res) => {
  res.json({ activity: await Activity.find({}).sort({ createdAt: -1 }).limit(200).lean() });
}));
