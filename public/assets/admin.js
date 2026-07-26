/* ============================================================
   ADMIN PANEL — #/admin/…  (login, dashboard, CRUD, settings)
   ============================================================ */
"use strict";

const ADMIN_NAV = [
  ["dashboard", "📊", "Dashboard"], ["orders", "🧾", "Orders"], ["products", "📦", "Products"],
  ["stock", "🔑", "Stock"], ["promos", "🏷️", "Promo Codes"], ["reviews", "⭐", "Reviews"],
  ["settings", "⚙️", "Site Settings"], ["admins", "👤", "Admins"], ["activity", "🕘", "Activity"],
];

function adminShell(page, content) {
  return `
  <div class="admin-layout">
    <aside class="admin-side">
      <a href="#/" class="logo" style="font-size:17px;padding:0 10px"><span class="text-holo">AI</span>Market <span class="tiny muted">admin</span></a>
      <nav>
        ${ADMIN_NAV.filter(([k]) => k !== "admins" || State.admin?.role === "owner").map(([k, icon, label]) =>
          `<a href="#/admin/${k}" class="${page === k ? "on" : ""}">${icon} ${label}</a>`).join("")}
        <a href="#/" onclick="adminLogout()">🚪 Logout</a>
      </nav>
    </aside>
    <div class="admin-main">${content}</div>
  </div>`;
}
const needLogin = () => { location.hash = "#/admin/login"; return ""; };

/* ------------------------------- Login ------------------------------- */
route("/admin", async () => { location.hash = State.adminToken ? "#/admin/dashboard" : "#/admin/login"; return ""; });
route("/admin/login", async () => {
  document.title = "Admin Login";
  return `
  <div style="min-height:100vh;display:grid;place-items:center;padding:18px">
    <div class="holo-spin pop" style="padding:34px;width:100%;max-width:400px">
      <div class="center"><span style="font-size:36px">🔐</span><h2 class="mt-2">Admin <em class="text-holo">Login</em></h2></div>
      <label class="field mt-4"><span>Email</span><input id="adEmail" type="email" class="input"></label>
      <label class="field mt-2"><span>Password</span><input id="adPass" type="password" class="input" onkeydown="if(event.key==='Enter')doAdminLogin()"></label>
      <button class="btn btn-gold mt-3" style="width:100%" onclick="doAdminLogin()">Sign in →</button>
    </div>
  </div>`;
});
window.doAdminLogin = async () => {
  try {
    const res = await api("/admin/login", { method: "POST", body: { email: $("#adEmail").value, password: $("#adPass").value } });
    State.adminToken = res.token; State.admin = res.admin;
    localStorage.setItem("adminToken", res.token); localStorage.setItem("adminInfo", JSON.stringify(res.admin));
    location.hash = "#/admin/dashboard";
  } catch (e) { toast(e.message, "err"); }
};

/* ------------------------------ Dashboard ------------------------------ */
route("/admin/dashboard", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/dashboard", { admin: true });
  document.title = "Dashboard";
  const stat = (label, val, color = "var(--gold)") =>
    `<div class="glass stat-card"><div class="tiny muted" style="letter-spacing:.12em;text-transform:uppercase">${label}</div>
     <div class="stat-num mt-1" style="color:${color}">${val}</div></div>`;
  return adminShell("dashboard", `
    <div class="between"><h2>Dashboard</h2><span class="tiny muted">Hi, ${esc(State.admin?.nickname || "")} 👋</span></div>
    <div class="grid-3 mt-3">
      ${stat("Pending", d.stats.pending, "var(--amber)")}
      ${stat("Approved", d.stats.approved, "var(--azure)")}
      ${stat("Delivered", d.stats.delivered, "var(--green)")}
      ${stat("Rejected", d.stats.rejected, "var(--red)")}
      ${stat("Products", d.stats.products)}
      ${stat("Stock available", d.stats.stock)}
    </div>
    <div class="grid-2 mt-3">
      <div class="glass" style="padding:20px">
        <span class="eyebrow">Revenue (approved + delivered)</span>
        <div class="grid mt-2">${d.revenue.length ? d.revenue.map((r) => `<div class="between"><b>${esc(r._id)}</b><span>${money(r.total, r._id)} <span class="tiny muted">· ${r.n} orders</span></span></div>`).join("") : `<p class="muted small">No sales yet.</p>`}</div>
        <div class="mt-3"><span class="eyebrow">Top products</span>
          <div class="grid mt-2">${d.topProducts.map((p) => `<div class="between small"><span>${esc(p._id)}</span><b>${p.sold} sold</b></div>`).join("") || `<p class="muted small">—</p>`}</div></div>
      </div>
      <div class="glass" style="padding:20px">
        <span class="eyebrow">⚠️ Low stock (≤2)</span>
        <div class="grid mt-2">${d.lowStock.length ? d.lowStock.map((x) => `<div class="between small"><span>${esc(x.title)}</span><b style="color:${x.available === 0 ? "var(--red)" : "var(--amber)"}">${x.available} left</b></div>`).join("") : `<p class="muted small">All good ✅</p>`}</div>
        <div class="mt-3"><span class="eyebrow">Recent activity</span>
          <div class="grid mt-2" style="gap:6px">${d.recentActivity.map((a) => `<div class="tiny muted"><b style="color:var(--text)">${esc(a.actor)}</b> ${esc(a.message)} · ${dt(a.createdAt)}</div>`).join("")}</div></div>
      </div>
    </div>
    <div class="glass mt-3" style="padding:20px">
      <div class="between"><span class="eyebrow">Recent orders</span><a class="btn btn-ghost btn-sm" href="#/admin/orders">View all →</a></div>
      ${ordersTable(d.recentOrders, false)}
    </div>`);
});

/* ------------------------------- Orders ------------------------------- */
let orderFilter = { status: "pending", q: "" };
route("/admin/orders", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api(`/admin/orders?status=${orderFilter.status === "all" ? "" : orderFilter.status}&q=${encodeURIComponent(orderFilter.q)}`, { admin: true });
  document.title = "Orders";
  return adminShell("orders", `
    <div class="between"><h2>Orders</h2>
      <button class="btn btn-ghost btn-sm" onclick="exportOrders()">⬇ Export CSV</button></div>
    <div class="between mt-3">
      <div class="row" style="flex-wrap:wrap">
        ${["pending", "approved", "delivered", "rejected", "all"].map((st) =>
          `<button class="chip ${orderFilter.status === st ? "on" : ""}" onclick="orderFilter.status='${st}';render()">${st}</button>`).join("")}
      </div>
      <input class="input" style="max-width:240px" placeholder="Search order / trx / email…" value="${esc(orderFilter.q)}"
        onkeydown="if(event.key==='Enter'){orderFilter.q=this.value;render()}">
    </div>
    <div class="glass mt-3" style="padding:6px 14px">${ordersTable(d.orders, true)}</div>`);
});

function ordersTable(orders, actions) {
  if (!orders.length) return `<p class="muted small" style="padding:14px 0">No orders here.</p>`;
  return `<div class="table-wrap"><table class="t">
    <tr><th>Order</th><th>Customer</th><th>Payment</th><th>Amount</th><th>Status</th><th>Date</th>${actions ? "<th></th>" : ""}</tr>
    ${orders.map((o) => `
    <tr>
      <td><b class="mono tiny">${esc(o.orderId)}</b><br><span class="tiny muted">${esc(o.icon || "")} ${esc(o.title)}</span></td>
      <td class="small">${esc(o.customer?.name)}<br><span class="tiny muted">${esc(o.customer?.email)}${o.customer?.contact ? ` · ${esc(o.customer.contact)}` : ""}</span></td>
      <td class="small">${esc(o.channel || o.gateway)}<br><span class="tiny mono muted">${esc(o.transactionId)}</span></td>
      <td><b>${money(o.amount, o.currency)}</b>${o.promoCode ? `<br><span class="tiny" style="color:var(--green)">${esc(o.promoCode)} −${money(o.promoDiscount, o.currency)}</span>` : ""}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="tiny muted">${dt(o.createdAt)}</td>
      ${actions ? `<td><div class="row" style="flex-wrap:wrap;gap:6px">
        ${o.status === "pending" ? `<button class="btn btn-gold btn-sm" onclick="orderAct('${o.id}','approve')">✓ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="orderReject('${o.id}')">✕</button>` : ""}
        ${o.status === "approved" ? `<button class="btn btn-ghost btn-sm" onclick="orderAct('${o.id}','deliver')">📬 Delivered</button>` : ""}
      </div></td>` : ""}
    </tr>`).join("")}
  </table></div>`;
}
window.orderAct = async (id, action) => {
  try { await api(`/admin/orders/${id}/${action}`, { method: "POST", admin: true, body: {} }); toast(`Order ${action}d ✔`); render(); }
  catch (e) { toast(e.message, "err"); }
};
window.orderReject = async (id) => {
  const reason = prompt("Reject reason (customer will see this):", "Payment could not be verified.");
  if (reason === null) return;
  try { await api(`/admin/orders/${id}/reject`, { method: "POST", admin: true, body: { reason } }); toast("Order rejected"); render(); }
  catch (e) { toast(e.message, "err"); }
};
window.exportOrders = async () => {
  try {
    const res = await fetch("/api/admin/orders-export.csv", { headers: { Authorization: `Bearer ${State.adminToken}` } });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) { toast(e.message, "err"); }
};

/* ------------------------------ Products ------------------------------ */
route("/admin/products", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/products", { admin: true });
  window._products = d.products;
  document.title = "Products";
  return adminShell("products", `
    <div class="between"><h2>Products</h2><button class="btn btn-gold btn-sm" onclick="productForm()">＋ New product</button></div>
    <div class="glass mt-3" style="padding:6px 14px"><div class="table-wrap"><table class="t">
      <tr><th>Product</th><th>Prices (BD/PK/USD)</th><th>Stock</th><th>Active</th><th>Sort</th><th></th></tr>
      ${d.products.map((p) => `
      <tr>
        <td><b>${esc(p.icon)} ${esc(p.title)}</b><br><span class="tiny muted mono">/${esc(p.slug)} · ${esc(p.category)}</span></td>
        <td class="small mono">৳${p.priceBDT} / ₨${p.pricePKR} / $${p.priceUSD}</td>
        <td><b style="color:${p.stock === 0 ? "var(--red)" : p.stock <= 2 ? "var(--amber)" : "var(--green)"}">${p.stock}</b></td>
        <td>${p.isActive ? `<span class="badge badge-green">live</span>` : `<span class="badge badge-red">hidden</span>`}</td>
        <td class="tiny muted">${p.sortOrder}</td>
        <td><div class="row" style="gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="productForm('${p.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="productDelete('${p.id}')">✕</button></div></td>
      </tr>`).join("")}
    </table></div></div>
    <div id="modalHost"></div>`);
});

window.productForm = (id) => {
  const p = id ? window._products.find((x) => x.id === id) : {};
  const f = (k, d = "") => esc(p?.[k] ?? d);
  $("#modalHost").innerHTML = `
  <div class="modal-back" onclick="if(event.target===this)this.remove()">
    <div class="modal">
      <div class="between"><h3>${id ? "Edit" : "New"} product</h3><button onclick="this.closest('.modal-back').remove()">✕</button></div>
      <div class="grid-2 mt-3">
        <label class="field"><span>Title</span><input id="pfTitle" class="input" value="${f("title")}"></label>
        <label class="field"><span>Slug (url)</span><input id="pfSlug" class="input mono" value="${f("slug")}" placeholder="chatgpt-plus"></label>
        <label class="field"><span>Category</span><input id="pfCat" class="input" value="${f("category", "AI Tools")}"></label>
        <label class="field"><span>Icon (emoji)</span><input id="pfIcon" class="input" value="${f("icon", "✨")}"></label>
        <label class="field"><span>Logo image URL (optional)</span><input id="pfLogo" class="input" value="${f("logoUrl")}"></label>
        <label class="field"><span>Badge</span><input id="pfBadge" class="input" value="${f("badge")}" placeholder="Best Seller"></label>
      </div>
      <label class="field mt-2"><span>Short description (card)</span><input id="pfShort" class="input" value="${f("shortDescription")}"></label>
      <label class="field mt-2"><span>Full description</span><textarea id="pfDesc" class="input">${f("description")}</textarea></label>
      <label class="field mt-2"><span>Features (one per line)</span><textarea id="pfFeat" class="input">${esc((p?.features || []).join("\n"))}</textarea></label>
      <div class="grid-3 mt-2">
        <label class="field"><span>Price ৳ BDT</span><input id="pfBDT" type="number" class="input" value="${f("priceBDT", 0)}"></label>
        <label class="field"><span>Price ₨ PKR</span><input id="pfPKR" type="number" class="input" value="${f("pricePKR", 0)}"></label>
        <label class="field"><span>Price $ USD</span><input id="pfUSD" type="number" class="input" value="${f("priceUSD", 0)}"></label>
        <label class="field"><span>Original ৳</span><input id="pfOBDT" type="number" class="input" value="${f("originalBDT", 0)}"></label>
        <label class="field"><span>Original ₨</span><input id="pfOPKR" type="number" class="input" value="${f("originalPKR", 0)}"></label>
        <label class="field"><span>Original $</span><input id="pfOUSD" type="number" class="input" value="${f("originalUSD", 0)}"></label>
      </div>
      <div class="grid-3 mt-2">
        <label class="field"><span>Sort order</span><input id="pfSort" type="number" class="input" value="${f("sortOrder", 100)}"></label>
        <label class="field"><span>Active</span><select id="pfActive" class="input"><option value="1" ${p?.isActive !== false ? "selected" : ""}>Live</option><option value="0" ${p?.isActive === false ? "selected" : ""}>Hidden</option></select></label>
      </div>
      <label class="field mt-2"><span>Delivery method note</span><input id="pfDeliv" class="input" value="${f("deliveryMethod")}"></label>
      <label class="field mt-2"><span>Terms</span><textarea id="pfTerms" class="input" style="min-height:56px">${f("terms")}</textarea></label>
      <button class="btn btn-gold mt-3" style="width:100%" onclick="productSave('${id || ""}')">💾 Save product</button>
    </div>
  </div>`;
};
window.productSave = async (id) => {
  const body = {
    title: $("#pfTitle").value, slug: $("#pfSlug").value, category: $("#pfCat").value,
    icon: $("#pfIcon").value, logoUrl: $("#pfLogo").value, badge: $("#pfBadge").value,
    shortDescription: $("#pfShort").value, description: $("#pfDesc").value,
    features: $("#pfFeat").value.split("\n").map((x) => x.trim()).filter(Boolean),
    priceBDT: $("#pfBDT").value, pricePKR: $("#pfPKR").value, priceUSD: $("#pfUSD").value,
    originalBDT: $("#pfOBDT").value, originalPKR: $("#pfOPKR").value, originalUSD: $("#pfOUSD").value,
    sortOrder: $("#pfSort").value, isActive: $("#pfActive").value === "1",
    deliveryMethod: $("#pfDeliv").value, terms: $("#pfTerms").value,
  };
  try {
    await api(id ? `/admin/products/${id}` : "/admin/products", { method: id ? "PUT" : "POST", admin: true, body });
    toast("Product saved ✔"); State.products = null; render();
  } catch (e) { toast(e.message, "err"); }
};
window.productDelete = async (id) => {
  if (!confirm("Delete this product? Its available stock will also be removed.")) return;
  try { await api(`/admin/products/${id}`, { method: "DELETE", admin: true }); toast("Deleted"); State.products = null; render(); }
  catch (e) { toast(e.message, "err"); }
};

/* -------------------------------- Stock -------------------------------- */
let stockFilter = { productId: "", status: "available" };
route("/admin/stock", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const [prod, d] = await Promise.all([
    api("/admin/products", { admin: true }),
    api(`/admin/stock?status=${stockFilter.status}&productId=${stockFilter.productId}`, { admin: true }),
  ]);
  window._products = prod.products;
  document.title = "Stock";
  return adminShell("stock", `
    <div class="between"><h2>Stock</h2><button class="btn btn-gold btn-sm" onclick="stockForm()">＋ Add stock</button></div>
    <div class="row mt-3" style="flex-wrap:wrap">
      <select class="input" style="max-width:240px" onchange="stockFilter.productId=this.value;render()">
        <option value="">All products</option>
        ${prod.products.map((p) => `<option value="${p.id}" ${stockFilter.productId === p.id ? "selected" : ""}>${esc(p.title)} (${p.stock})</option>`).join("")}
      </select>
      ${["available", "delivered"].map((st) => `<button class="chip ${stockFilter.status === st ? "on" : ""}" onclick="stockFilter.status='${st}';render()">${st}</button>`).join("")}
    </div>
    <div class="glass mt-3" style="padding:6px 14px"><div class="table-wrap"><table class="t">
      <tr><th>Product</th><th>Email</th><th>Password</th><th>Extra</th><th>Status</th><th>Added</th><th></th></tr>
      ${d.items.map((i) => `
      <tr>
        <td class="small">${esc(i.productId?.icon || "")} ${esc(i.productId?.title || "?")}</td>
        <td class="mono small">${esc(i.email)}</td><td class="mono small">${esc(i.password)}</td>
        <td class="tiny muted">${esc(i.extra)}</td>
        <td>${i.status === "available" ? `<span class="badge badge-green">available</span>` : `<span class="badge badge-blue">delivered</span>`}</td>
        <td class="tiny muted">${dt(i.createdAt)}<br>${esc(i.addedBy)}</td>
        <td>${i.status === "available" ? `<button class="btn btn-danger btn-sm" onclick="stockDelete('${i._id}')">✕</button>` : ""}</td>
      </tr>`).join("") || ""}
    </table>${d.items.length ? "" : `<p class="muted small" style="padding:14px 0">No stock items.</p>`}</div></div>
    <div id="modalHost"></div>`);
});
window.stockForm = () => {
  $("#modalHost").innerHTML = `
  <div class="modal-back" onclick="if(event.target===this)this.remove()">
    <div class="modal">
      <div class="between"><h3>Add stock</h3><button onclick="this.closest('.modal-back').remove()">✕</button></div>
      <label class="field mt-3"><span>Product</span><select id="sfProduct" class="input">
        ${window._products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join("")}</select></label>
      <div class="grid-2 mt-2">
        <label class="field"><span>Email / username</span><input id="sfEmail" class="input"></label>
        <label class="field"><span>Password</span><input id="sfPass" class="input"></label>
      </div>
      <label class="field mt-2"><span>Extra (2FA, pin…)</span><input id="sfExtra" class="input"></label>
      <label class="field mt-2"><span>Instructions for customer</span><textarea id="sfIns" class="input" style="min-height:56px">Do not change the password. Contact support for any issue.</textarea></label>
      <div class="ticket-divider" style="margin:16px 0"></div>
      <label class="field"><span>OR bulk add — one per line: <code class="mono">email:password</code></span>
        <textarea id="sfBulk" class="input mono" placeholder="user1@mail.com:pass123&#10;user2@mail.com:pass456"></textarea></label>
      <button class="btn btn-gold mt-3" style="width:100%" onclick="stockSave()">💾 Add</button>
    </div>
  </div>`;
};
window.stockSave = async () => {
  const bulk = $("#sfBulk").value.split("\n").map((x) => x.trim()).filter(Boolean);
  const body = { productId: $("#sfProduct").value, instructions: $("#sfIns").value };
  if (bulk.length) body.bulk = bulk;
  else { body.email = $("#sfEmail").value; body.password = $("#sfPass").value; body.extra = $("#sfExtra").value; }
  try {
    const res = await api("/admin/stock", { method: "POST", admin: true, body });
    toast(`Added ${res.count} item(s) ✔`); render();
  } catch (e) { toast(e.message, "err"); }
};
window.stockDelete = async (id) => {
  if (!confirm("Delete this stock item?")) return;
  try { await api(`/admin/stock/${id}`, { method: "DELETE", admin: true }); toast("Deleted"); render(); }
  catch (e) { toast(e.message, "err"); }
};

/* -------------------------------- Promos -------------------------------- */
route("/admin/promos", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/promos", { admin: true });
  window._promos = d.promos;
  document.title = "Promo codes";
  return adminShell("promos", `
    <div class="between"><h2>Promo Codes</h2><button class="btn btn-gold btn-sm" onclick="promoForm()">＋ New code</button></div>
    <div class="glass mt-3" style="padding:6px 14px"><div class="table-wrap"><table class="t">
      <tr><th>Code</th><th>Discount</th><th>Usage</th><th>Window</th><th>Status</th><th></th></tr>
      ${d.promos.map((p) => `
      <tr>
        <td><b class="mono">${esc(p.code)}</b><br><span class="tiny muted">${esc(p.note)}</span></td>
        <td class="small">${p.discountType === "percent" ? `${p.percentOff}% off` : `৳${p.fixedBDT} / ₨${p.fixedPKR} / $${p.fixedUSD}`}</td>
        <td class="small">${p.usedCount}${p.maxUses ? ` / ${p.maxUses}` : ""}</td>
        <td class="tiny muted">${p.startsAt ? dt(p.startsAt) : "now"} →<br>${p.expiresAt ? dt(p.expiresAt) : "∞"}</td>
        <td>${p.isActive ? `<span class="badge badge-green">active</span>` : `<span class="badge badge-red">off</span>`}</td>
        <td><div class="row" style="gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="promoForm('${p._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="promoDelete('${p._id}')">✕</button></div></td>
      </tr>`).join("")}
    </table>${d.promos.length ? "" : `<p class="muted small" style="padding:14px 0">No promo codes yet.</p>`}</div></div>
    <div id="modalHost"></div>`);
});
window.promoForm = (id) => {
  const p = id ? window._promos.find((x) => x._id === id) : {};
  const f = (k, d = "") => esc(p?.[k] ?? d);
  const dtv = (v) => (v ? new Date(v).toISOString().slice(0, 16) : "");
  $("#modalHost").innerHTML = `
  <div class="modal-back" onclick="if(event.target===this)this.remove()">
    <div class="modal">
      <div class="between"><h3>${id ? "Edit" : "New"} promo</h3><button onclick="this.closest('.modal-back').remove()">✕</button></div>
      <div class="grid-2 mt-3">
        <label class="field"><span>Code</span><input id="prCode" class="input mono" style="text-transform:uppercase" value="${f("code")}" placeholder="WELCOME10"></label>
        <label class="field"><span>Type</span><select id="prType" class="input">
          <option value="percent" ${p?.discountType !== "fixed" ? "selected" : ""}>Percent %</option>
          <option value="fixed" ${p?.discountType === "fixed" ? "selected" : ""}>Fixed amount</option></select></label>
      </div>
      <label class="field mt-2"><span>Note (internal)</span><input id="prNote" class="input" value="${f("note")}"></label>
      <div class="grid-3 mt-2">
        <label class="field"><span>% off</span><input id="prPct" type="number" class="input" value="${f("percentOff", 0)}"></label>
        <label class="field"><span>Max uses (0=∞)</span><input id="prMax" type="number" class="input" value="${f("maxUses", 0)}"></label>
      </div>
      <div class="grid-3 mt-2">
        <label class="field"><span>Fixed ৳</span><input id="prFB" type="number" class="input" value="${f("fixedBDT", 0)}"></label>
        <label class="field"><span>Fixed ₨</span><input id="prFP" type="number" class="input" value="${f("fixedPKR", 0)}"></label>
        <label class="field"><span>Fixed $</span><input id="prFU" type="number" class="input" value="${f("fixedUSD", 0)}"></label>
      </div>
      <div class="grid-3 mt-2">
        <label class="field"><span>Min ৳</span><input id="prMB" type="number" class="input" value="${f("minBDT", 0)}"></label>
        <label class="field"><span>Min ₨</span><input id="prMP" type="number" class="input" value="${f("minPKR", 0)}"></label>
        <label class="field"><span>Min $</span><input id="prMU" type="number" class="input" value="${f("minUSD", 0)}"></label>
      </div>
      <div class="grid-2 mt-2">
        <label class="field"><span>Starts</span><input id="prStart" type="datetime-local" class="input" value="${dtv(p?.startsAt)}"></label>
        <label class="field"><span>Expires</span><input id="prEnd" type="datetime-local" class="input" value="${dtv(p?.expiresAt)}"></label>
      </div>
      <label class="field mt-2"><span>Active</span><select id="prActive" class="input">
        <option value="1" ${p?.isActive !== false ? "selected" : ""}>Active</option>
        <option value="0" ${p?.isActive === false ? "selected" : ""}>Off</option></select></label>
      <button class="btn btn-gold mt-3" style="width:100%" onclick="promoSave('${id || ""}')">💾 Save</button>
    </div>
  </div>`;
};
window.promoSave = async (id) => {
  const body = {
    code: $("#prCode").value, note: $("#prNote").value,
    discountType: $("#prType").value, percentOff: $("#prPct").value,
    fixedBDT: $("#prFB").value, fixedPKR: $("#prFP").value, fixedUSD: $("#prFU").value,
    maxUses: $("#prMax").value, minBDT: $("#prMB").value, minPKR: $("#prMP").value, minUSD: $("#prMU").value,
    startsAt: $("#prStart").value || null, expiresAt: $("#prEnd").value || null,
    isActive: $("#prActive").value === "1",
  };
  try {
    await api(id ? `/admin/promos/${id}` : "/admin/promos", { method: id ? "PUT" : "POST", admin: true, body });
    toast("Promo saved ✔"); render();
  } catch (e) { toast(e.message, "err"); }
};
window.promoDelete = async (id) => {
  if (!confirm("Delete this promo code?")) return;
  try { await api(`/admin/promos/${id}`, { method: "DELETE", admin: true }); toast("Deleted"); render(); }
  catch (e) { toast(e.message, "err"); }
};

/* -------------------------------- Reviews -------------------------------- */
let reviewFilter = "pending";
route("/admin/reviews", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api(`/admin/reviews?status=${reviewFilter}`, { admin: true });
  document.title = "Reviews";
  return adminShell("reviews", `
    <h2>Reviews</h2>
    <div class="row mt-3">${["pending", "approved"].map((st) => `<button class="chip ${reviewFilter === st ? "on" : ""}" onclick="reviewFilter='${st}';render()">${st}</button>`).join("")}</div>
    <div class="grid mt-3">
      ${d.reviews.map((r) => `
      <div class="glass" style="padding:16px">
        <div class="between">
          <div><b class="small">${esc(r.name)}</b> <span class="stars">${stars(r.rating)}</span>
            <span class="tiny muted">on ${esc(r.productId?.title || "?")} · ${dt(r.createdAt)}</span></div>
          <div class="row" style="gap:6px">
            ${r.status === "pending" ? `<button class="btn btn-gold btn-sm" onclick="reviewAct('${r._id}','approved')">✓ Approve</button>` : ""}
            <button class="btn btn-danger btn-sm" onclick="reviewDelete('${r._id}')">✕</button>
          </div>
        </div>
        ${r.text ? `<p class="small muted mt-2">${esc(r.text)}</p>` : ""}
      </div>`).join("") || `<p class="muted small">Nothing here.</p>`}
    </div>`);
});
window.reviewAct = async (id, status) => {
  try { await api(`/admin/reviews/${id}`, { method: "PATCH", admin: true, body: { status } }); toast("Approved ✔"); render(); }
  catch (e) { toast(e.message, "err"); }
};
window.reviewDelete = async (id) => {
  if (!confirm("Delete review?")) return;
  try { await api(`/admin/reviews/${id}`, { method: "DELETE", admin: true }); toast("Deleted"); render(); }
  catch (e) { toast(e.message, "err"); }
};

/* ------------------------------- Settings ------------------------------- */
route("/admin/settings", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/settings", { admin: true });
  const s = d.settings;
  window._faqs = (s.faqs || []).map((f) => ({ q: f.q || "", a: f.a || "", qBn: f.qBn || "", aBn: f.aBn || "" }));
  document.title = "Site settings";
  const F = (id, label, value, ph = "") => `<label class="field"><span>${label}</span><input id="${id}" class="input" value="${esc(value ?? "")}" placeholder="${esc(ph)}"></label>`;
  return adminShell("settings", `
    <h2>Site Settings <span class="tiny muted">— everything here updates the live site instantly</span></h2>

    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Brand</span>
      <div class="grid-2 mt-2">
        ${F("stName", "Site name", s.brand.name)}
        ${F("stAccent", "Colored part of logo", s.brand.accent, "AI")}
        ${F("stTagline", "Tagline", s.brand.tagline)}
        ${F("stDesc", "Meta description", s.brand.description)}
      </div></div>

    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Hero (homepage)</span>
      <div class="grid-2 mt-2">
        ${F("stH1", "Headline line 1", s.hero.line1)}
        ${F("stH2", "Headline line 2 (gold)", s.hero.line2)}
      </div>
      <label class="field mt-2"><span>Sub text</span><textarea id="stHSub" class="input" style="min-height:56px">${esc(s.hero.sub)}</textarea></label>
      <div class="grid-3 mt-2">
        ${F("stStOrders", "Stat: orders", s.stats.orders)}
        ${F("stStTime", "Stat: delivery time", s.stats.deliveryTime)}
        ${F("stStRating", "Stat: rating", s.stats.rating)}
      </div></div>

    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Announcement bar</span>
      <div class="row mt-2">
        <select id="stAnnOn" class="input" style="max-width:140px">
          <option value="1" ${s.announcement.enabled ? "selected" : ""}>On</option>
          <option value="0" ${!s.announcement.enabled ? "selected" : ""}>Off</option></select>
        <input id="stAnnText" class="input" value="${esc(s.announcement.text)}" placeholder="🎉 Eid sale — use code EID20 for 20% off!">
      </div></div>

    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Support</span>
      <div class="grid-3 mt-2">
        ${F("stWaBD", "WhatsApp BD (8801…)", s.support.whatsappBD)}
        ${F("stWaPK", "WhatsApp PK (92…)", s.support.whatsappPK)}
        ${F("stTg", "Telegram link", s.support.telegram, "https://t.me/…")}
      </div></div>

    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Payment numbers</span>
      <p class="tiny muted mt-1">এখানে নাম্বার বসালেই চেকআউটে দেখা যাবে। খালি রাখলে কাস্টমার “Not set” দেখবে।</p>
      <div class="grid-2 mt-2">
        ${F("pyBkash", "🇧🇩 bKash number", s.payment.bangladesh.bkash)}
        ${F("pyNagad", "🇧🇩 Nagad number", s.payment.bangladesh.nagad)}
      </div>
      <label class="field mt-2"><span>🇧🇩 BD instructions</span><input id="pyBdIns" class="input" value="${esc(s.payment.bangladesh.instructions)}"></label>
      <div class="grid-3 mt-2">
        ${F("pyEasy", "🇵🇰 Easypaisa", s.payment.pakistan.easypaisa)}
        ${F("pyJazz", "🇵🇰 JazzCash", s.payment.pakistan.jazzcash)}
        ${F("pyBank", "🇵🇰 Bank (name+acc)", s.payment.pakistan.bank)}
      </div>
      <label class="field mt-2"><span>🇵🇰 PK instructions</span><input id="pyPkIns" class="input" value="${esc(s.payment.pakistan.instructions)}"></label>
      <div class="grid-3 mt-2">
        ${F("pyPayId", "🟡 Binance Pay ID", s.payment.binance.payId)}
        ${F("pyTrc", "USDT TRC20 address", s.payment.binance.walletTRC20)}
        ${F("pyBep", "USDT BEP20 address", s.payment.binance.walletBEP20)}
      </div>
      <label class="field mt-2"><span>🟡 Crypto instructions</span><input id="pyBiIns" class="input" value="${esc(s.payment.binance.instructions)}"></label>
      <div class="grid-3 mt-2">
        <label class="field"><span>🇧🇩 gateway</span><select id="pyBdOn" class="input"><option value="1" ${s.payment.bangladesh.enabled ? "selected" : ""}>Enabled</option><option value="0" ${!s.payment.bangladesh.enabled ? "selected" : ""}>Disabled</option></select></label>
        <label class="field"><span>🇵🇰 gateway</span><select id="pyPkOn" class="input"><option value="1" ${s.payment.pakistan.enabled ? "selected" : ""}>Enabled</option><option value="0" ${!s.payment.pakistan.enabled ? "selected" : ""}>Disabled</option></select></label>
        <label class="field"><span>🟡 gateway</span><select id="pyBiOn" class="input"><option value="1" ${s.payment.binance.enabled ? "selected" : ""}>Enabled</option><option value="0" ${!s.payment.binance.enabled ? "selected" : ""}>Disabled</option></select></label>
      </div></div>

    <div class="glass mt-3" style="padding:20px">
      <div class="between"><span class="eyebrow">FAQs (EN + বাংলা)</span>
        <button class="btn btn-ghost btn-sm" onclick="window._faqs.push({q:'',a:'',qBn:'',aBn:''});renderFaqEditor()">＋ Add FAQ</button></div>
      <div id="faqEditor" class="grid mt-2"></div></div>

    <button class="btn btn-gold mt-3" style="width:100%;padding:15px" onclick="settingsSave()">💾 Save all settings</button>
    <div class="mt-4 glass" style="padding:20px"><span class="eyebrow">My password</span>
      <div class="row mt-2"><input id="myPass" type="password" class="input" style="max-width:280px" placeholder="New password (10+ chars)">
      <button class="btn btn-ghost btn-sm" onclick="changeMyPassword()">Change</button></div></div>`);
});
window.renderFaqEditor = () => {
  $("#faqEditor").innerHTML = window._faqs.map((f, i) => `
    <div style="border:1px solid var(--border);border-radius:13px;padding:13px">
      <div class="between"><b class="tiny muted">FAQ ${i + 1}</b><button class="btn btn-danger btn-sm" onclick="window._faqs.splice(${i},1);renderFaqEditor()">✕</button></div>
      <div class="grid-2 mt-2">
        <input class="input" placeholder="Question (EN)" value="${esc(f.q)}" oninput="window._faqs[${i}].q=this.value">
        <input class="input" placeholder="প্রশ্ন (BN)" value="${esc(f.qBn)}" oninput="window._faqs[${i}].qBn=this.value">
        <input class="input" placeholder="Answer (EN)" value="${esc(f.a)}" oninput="window._faqs[${i}].a=this.value">
        <input class="input" placeholder="উত্তর (BN)" value="${esc(f.aBn)}" oninput="window._faqs[${i}].aBn=this.value">
      </div>
    </div>`).join("") || `<p class="muted small">No FAQs yet.</p>`;
};
// Render FAQ editor after settings page paints
new MutationObserver(() => { if ($("#faqEditor") && !$("#faqEditor").innerHTML) renderFaqEditor(); })
  .observe(document.documentElement, { childList: true, subtree: true });

window.settingsSave = async () => {
  const body = {
    brand: { name: $("#stName").value, accent: $("#stAccent").value, tagline: $("#stTagline").value, description: $("#stDesc").value },
    hero: { line1: $("#stH1").value, line2: $("#stH2").value, sub: $("#stHSub").value },
    stats: { orders: $("#stStOrders").value, deliveryTime: $("#stStTime").value, rating: $("#stStRating").value },
    announcement: { enabled: $("#stAnnOn").value === "1", text: $("#stAnnText").value },
    support: { whatsappBD: $("#stWaBD").value, whatsappPK: $("#stWaPK").value, telegram: $("#stTg").value },
    payment: {
      bangladesh: { bkash: $("#pyBkash").value, nagad: $("#pyNagad").value, instructions: $("#pyBdIns").value, enabled: $("#pyBdOn").value === "1" },
      pakistan: { easypaisa: $("#pyEasy").value, jazzcash: $("#pyJazz").value, bank: $("#pyBank").value, instructions: $("#pyPkIns").value, enabled: $("#pyPkOn").value === "1" },
      binance: { payId: $("#pyPayId").value, walletTRC20: $("#pyTrc").value, walletBEP20: $("#pyBep").value, instructions: $("#pyBiIns").value, enabled: $("#pyBiOn").value === "1" },
    },
    faqs: window._faqs,
  };
  try {
    await api("/admin/settings", { method: "PUT", admin: true, body });
    State.settings = null; toast("Settings saved ✔ — live site updated");
  } catch (e) { toast(e.message, "err"); }
};
window.changeMyPassword = async () => {
  try { await api("/admin/me/password", { method: "PATCH", admin: true, body: { password: $("#myPass").value } }); toast("Password changed ✔"); $("#myPass").value = ""; }
  catch (e) { toast(e.message, "err"); }
};

/* -------------------------------- Admins -------------------------------- */
route("/admin/admins", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/admins", { admin: true });
  document.title = "Admins";
  return adminShell("admins", `
    <h2>Admins <span class="tiny muted">(owner only)</span></h2>
    <div class="glass mt-3" style="padding:20px"><span class="eyebrow">Add admin</span>
      <div class="grid-3 mt-2">
        <input id="naEmail" class="input" placeholder="email@example.com">
        <input id="naNick" class="input" placeholder="Nickname">
        <input id="naPass" type="password" class="input" placeholder="Password (10+ chars)">
      </div>
      <div class="row mt-2">
        <select id="naRole" class="input" style="max-width:140px"><option value="admin">admin</option><option value="owner">owner</option></select>
        <button class="btn btn-gold btn-sm" onclick="adminCreate()">＋ Create</button>
      </div></div>
    <div class="glass mt-3" style="padding:6px 14px"><div class="table-wrap"><table class="t">
      <tr><th>Admin</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
      ${d.admins.map((a) => `
      <tr>
        <td><b class="small">${esc(a.nickname)}</b><br><span class="tiny muted">${esc(a.email)}</span></td>
        <td>${a.role === "owner" ? `<span class="badge badge-gold">owner</span>` : `<span class="badge badge-blue">admin</span>`}</td>
        <td>${a.isActive ? `<span class="badge badge-green">active</span>` : `<span class="badge badge-red">disabled</span>`}</td>
        <td class="tiny muted">${dt(a.lastLoginAt)}</td>
        <td><div class="row" style="gap:6px">
          ${a.id !== State.admin?.id ? `<button class="btn btn-ghost btn-sm" onclick="adminToggle('${a.id}',${a.isActive ? "false" : "true"})">${a.isActive ? "Disable" : "Enable"}</button>` : `<span class="tiny muted">you</span>`}
          <button class="btn btn-ghost btn-sm" onclick="adminResetPass('${a.id}')">Reset pass</button>
        </div></td>
      </tr>`).join("")}
    </table></div></div>`);
});
window.adminCreate = async () => {
  try {
    await api("/admin/admins", { method: "POST", admin: true, body: { email: $("#naEmail").value, nickname: $("#naNick").value, password: $("#naPass").value, role: $("#naRole").value } });
    toast("Admin created ✔"); render();
  } catch (e) { toast(e.message, "err"); }
};
window.adminToggle = async (id, isActive) => {
  try { await api(`/admin/admins/${id}/status`, { method: "PATCH", admin: true, body: { isActive } }); render(); }
  catch (e) { toast(e.message, "err"); }
};
window.adminResetPass = async (id) => {
  const password = prompt("New password (10+ chars):"); if (!password) return;
  try { await api(`/admin/admins/${id}/password`, { method: "PATCH", admin: true, body: { password } }); toast("Password reset ✔"); }
  catch (e) { toast(e.message, "err"); }
};

/* ------------------------------- Activity ------------------------------- */
route("/admin/activity", async () => {
  if (!State.adminToken) return needLogin();
  $("#app").innerHTML = spinnerPage();
  const d = await api("/admin/activity", { admin: true });
  document.title = "Activity";
  return adminShell("activity", `
    <h2>Activity Log</h2>
    <div class="glass mt-3" style="padding:6px 14px"><div class="table-wrap"><table class="t">
      <tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr>
      ${d.activity.map((a) => `<tr><td class="tiny muted">${dt(a.createdAt)}</td><td><b class="small">${esc(a.actor)}</b></td>
        <td class="tiny mono">${esc(a.action)}</td><td class="small muted">${esc(a.message)}</td></tr>`).join("")}
    </table></div></div>`);
});
