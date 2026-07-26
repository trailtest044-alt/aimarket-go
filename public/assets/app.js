/* ============================================================
   APP CORE — state, API, router, helpers  (framework-free)
   ============================================================ */
"use strict";

const API = "/api";
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const State = {
  lang: localStorage.getItem("lang") || (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Dhaka" ? "bn" : "en"),
  region: localStorage.getItem("region") || detectRegion(),
  settings: null,
  products: null,
  adminToken: localStorage.getItem("adminToken") || "",
  admin: JSON.parse(localStorage.getItem("adminInfo") || "null"),
  orderTokens: JSON.parse(localStorage.getItem("orderTokens") || "{}"),
  wishlist: JSON.parse(localStorage.getItem("wishlist") || "[]"),
};

function detectRegion() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz === "Asia/Dhaka") return "bd";
  if (tz === "Asia/Karachi") return "pk";
  return "world";
}
const t = (key) => (I18N[State.lang] && I18N[State.lang][key]) || I18N.en[key] || key;
function setLang(l) { State.lang = l; localStorage.setItem("lang", l); render(); }
function saveOrderToken(orderId, token) { State.orderTokens[orderId] = token; localStorage.setItem("orderTokens", JSON.stringify(State.orderTokens)); }
function toggleWish(id) {
  State.wishlist = State.wishlist.includes(id) ? State.wishlist.filter((x) => x !== id) : [...State.wishlist, id];
  localStorage.setItem("wishlist", JSON.stringify(State.wishlist));
  render();
}

/* ------------------------------- API ------------------------------- */
async function api(path, { method = "GET", body, admin = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin && State.adminToken) headers.Authorization = `Bearer ${State.adminToken}`;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* csv etc */ }
  if (!res.ok) {
    if (admin && res.status === 401) { adminLogout(false); location.hash = "#/admin/login"; }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
async function loadSettings() { if (!State.settings) State.settings = await api("/settings"); return State.settings; }
async function loadProducts(force = false) {
  if (!State.products || force) State.products = await api(`/products?region=${State.region}`);
  return State.products;
}
function adminLogout(redirect = true) {
  State.adminToken = ""; State.admin = null;
  localStorage.removeItem("adminToken"); localStorage.removeItem("adminInfo");
  if (redirect) location.hash = "#/admin/login";
}

/* ------------------------------ Helpers ------------------------------ */
const CURRENCY_SIGN = { BDT: "৳", PKR: "₨", USD: "$" };
const money = (amount, currency) => `${CURRENCY_SIGN[currency] || ""}${Number(amount || 0).toLocaleString()} ${currency === "USD" ? "USD" : ""}`.trim();
const stars = (avg) => { const full = Math.round(avg || 0); return "★".repeat(full) + "☆".repeat(5 - full); };
const dt = (v) => (v ? new Date(v).toLocaleString() : "—");

function toast(msg, type = "ok") {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; setTimeout(() => el.remove(), 400); }, 3200);
}
function copyText(value, msg) {
  navigator.clipboard?.writeText(value).then(() => toast(msg || t("copied")));
}
function spinnerPage(label = "Loading…") {
  return `<div class="wrap mt-5 center"><div class="spinner"></div><p class="muted mt-2 small">${esc(label)}</p></div>`;
}
function plogoHtml(p, size = "") {
  return p.logoUrl
    ? `<span class="plogo ${size}"><img src="${esc(p.logoUrl)}" alt="" loading="lazy"></span>`
    : `<span class="plogo ${size}">${esc(p.icon || "✨")}</span>`;
}
function statusBadge(status) {
  const map = { pending: ["badge-amber", t("status_pending")], approved: ["badge-blue", t("status_approved")], delivered: ["badge-green", t("status_delivered")], rejected: ["badge-red", t("status_rejected")] };
  const [cls, label] = map[status] || ["badge-gold", status];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

/* ------------------------------- Router ------------------------------- */
const routes = [];
function route(pattern, handler) { routes.push({ pattern, handler }); }
function matchRoute(hash) {
  const path = (hash || "#/").replace(/^#/, "").split("?")[0] || "/";
  const query = Object.fromEntries(new URLSearchParams((hash.split("?")[1] || "")));
  for (const r of routes) {
    const keys = [];
    const rx = new RegExp("^" + r.pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$");
    const m = path.match(rx);
    if (m) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { handler: r.handler, params, query };
    }
  }
  return null;
}
let currentRender = 0;
async function render() {
  const my = ++currentRender;
  const app = $("#app");
  const match = matchRoute(location.hash);
  window.scrollTo({ top: 0 });
  if (!match) { app.innerHTML = `<div class="wrap mt-5 center"><h1>404</h1><p class="muted mt-2">Page not found.</p><a class="btn btn-gold mt-3" href="#/">Home</a></div>`; return; }
  try {
    const html = await match.handler(match.params, match.query, () => my === currentRender);
    if (my !== currentRender) return;
    if (typeof html === "string") app.innerHTML = html;
  } catch (err) {
    if (my !== currentRender) return;
    app.innerHTML = `<div class="wrap mt-5 center"><h2>Something went wrong</h2><p class="muted mt-2">${esc(err.message)}</p><a class="btn btn-ghost mt-3" href="#/">Home</a></div>`;
  }
}
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => { if (!location.hash) location.hash = "#/"; render(); });
