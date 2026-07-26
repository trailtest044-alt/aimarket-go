/* ============================================================
   STOREFRONT PAGES — home, product, checkout, order, track
   ============================================================ */
"use strict";

/* ------------------------- Shared layout ------------------------- */
function waLink(number) { return number ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(number)}` : ""; }

function siteShell(content) {
  const s = State.settings;
  const b = s?.brand || { name: "AIMarket", accent: "AI", tagline: "" };
  const rest = b.name?.startsWith(b.accent) ? b.name.slice(b.accent.length) : b.name;
  const ann = s?.announcement;
  const sup = s?.support || {};
  return `
  ${ann?.enabled && ann.text ? `<div class="announce">${esc(ann.text)}</div>` : ""}
  <header class="site-header">
    <div class="wrap">
      <a href="#/" class="logo"><span class="text-holo">${esc(b.accent)}</span>${esc(rest)}</a>
      <nav class="nav-links">
        <a href="#/">${t("nav_products")}</a>
        <a href="#/track">${t("nav_track")}</a>
        <a href="#/#how">${t("nav_how")}</a>
        <button class="lang-toggle" onclick="setLang('${State.lang === "en" ? "bn" : "en"}')">${t("lang_btn")}</button>
      </nav>
    </div>
  </header>
  <main>${content}</main>
  <footer class="site-footer">
    <div class="wrap between">
      <div><b class="text-gold">${esc(b.name)}</b> — ${esc(b.tagline || "")}</div>
      <div class="small">© ${new Date().getFullYear()} ${esc(b.name)}. All rights reserved.</div>
    </div>
  </footer>
  <div class="floaters">
    ${sup.whatsappBD ? `<a class="floater" target="_blank" rel="noopener" href="${waLink(sup.whatsappBD)}">💬 WhatsApp BD</a>` : ""}
    ${sup.whatsappPK ? `<a class="floater" target="_blank" rel="noopener" href="${waLink(sup.whatsappPK)}">💬 WhatsApp PK</a>` : ""}
    ${sup.telegram ? `<a class="floater" target="_blank" rel="noopener" href="${esc(sup.telegram)}">✈️ Telegram</a>` : ""}
  </div>`;
}

/* ----------------------------- Home ----------------------------- */
let homeFilter = { q: "", cat: "all" };

route("/", async () => {
  document.title = "Loading…";
  $("#app").innerHTML = spinnerPage();
  const [s, data] = await Promise.all([loadSettings(), loadProducts()]);
  document.title = `${s.brand.name} — ${s.brand.tagline}`;
  return siteShell(homeHtml(s, data));
});

function homeHtml(s, data) {
  const cats = ["all", ...data.categories];
  const list = data.products.filter((p) =>
    (homeFilter.cat === "all" || p.category === homeFilter.cat) &&
    (!homeFilter.q || (p.title + p.category).toLowerCase().includes(homeFilter.q.toLowerCase())),
  );
  return `
  <section class="hero">
    <div class="hero-halo"></div>
    <div class="wrap stagger">
      <span class="trust-pill"><span class="live-dot"></span> ${esc(s.stats.orders)} orders · ${t("hero_trust")} ${esc(s.stats.deliveryTime)}</span>
      <h1 class="mt-3">${esc(s.hero.line1).replace(/AI/g, '<em class="text-holo">AI</em>')}<br><span class="text-gold">${esc(s.hero.line2)}</span></h1>
      <p class="sub mt-2">${esc(s.hero.sub)}</p>
      <div class="row mt-3" style="flex-wrap:wrap">
        <div class="row"><span class="stat-num text-gold">${esc(s.stats.orders)}</span><span class="muted small">orders<br>delivered</span></div>
        <div class="row" style="margin-left:18px"><span class="stat-num text-gold">${esc(s.stats.rating)}</span><span class="muted small">customer<br>rating</span></div>
        <div class="row" style="margin-left:18px"><span class="stat-num text-gold">${esc(s.stats.deliveryTime)}</span><span class="muted small">avg<br>delivery</span></div>
      </div>
    </div>
    <div class="marquee mt-3"><div class="marquee-track">
      ${[...Array(2)].map(() => `<span>⚡ Instant delivery</span><span>✅ Verified accounts</span><span>💳 bKash · Nagad · Easypaisa · Binance</span><span>🎁 Promo codes</span><span>💬 Real WhatsApp support</span><span>🔒 Secure checkout</span>`).join("")}
    </div></div>
  </section>

  <section class="wrap" id="products">
    <div class="between">
      <span class="eyebrow">${t("nav_products")}</span>
      <input class="input" style="max-width:250px" placeholder="${t("search_ph")}" value="${esc(homeFilter.q)}"
        oninput="homeFilter.q=this.value; refreshHomeGrid()">
    </div>
    <div class="row mt-2" style="flex-wrap:wrap" id="catChips">
      ${cats.map((c) => `<button class="chip ${homeFilter.cat === c ? "on" : ""}" onclick="homeFilter.cat='${esc(c)}';refreshHomeGrid(true)">${c === "all" ? t("all") : esc(c)}</button>`).join("")}
    </div>
    <div class="products-grid mt-3 stagger" id="productGrid">${productCards(list)}</div>
  </section>

  <section class="wrap mt-5" id="how">
    <span class="eyebrow">${t("how_title")}</span>
    <div class="grid-2 mt-3 stagger">
      ${[1, 2, 3, 4].map((i) => `
      <div class="glass" style="padding:20px">
        <div class="row"><span class="step-dot" style="--w:var(--gold);--w2:var(--gold-2);--wink:var(--gold-ink)">${i}</span><b>${t("how_" + i)}</b></div>
        <p class="muted small mt-2">${t("how_" + i + "s")}</p>
      </div>`).join("")}
    </div>
  </section>

  ${s.faqs?.length ? `
  <section class="wrap mt-5" id="faq">
    <span class="eyebrow">${t("faq_title")}</span>
    <div class="grid mt-3">
      ${s.faqs.map((f) => {
        const q = State.lang === "bn" && f.qBn ? f.qBn : f.q;
        const a = State.lang === "bn" && f.aBn ? f.aBn : f.a;
        return q ? `<details class="faq"><summary>${esc(q)}</summary><div class="a">${esc(a)}</div></details>` : "";
      }).join("")}
    </div>
  </section>` : ""}
  `;
}

function productCards(list) {
  if (!list.length) return `<p class="muted">${t("empty_products")}</p>`;
  return list.map((p) => {
    const oos = p.stock <= 0;
    const wished = State.wishlist.includes(p.id);
    return `
    <div class="pcard ${oos ? "oos" : ""}">
      ${p.badge ? `<span class="badge badge-gold" style="position:absolute;top:14px;right:14px">${esc(p.badge)}</span>` : ""}
      <button title="Wishlist" style="position:absolute;top:12px;left:14px;font-size:16px" onclick="toggleWish('${p.id}')">${wished ? "❤️" : "🤍"}</button>
      <div class="row" style="margin-top:6px">${plogoHtml(p)}<div><div class="pname">${esc(p.title)}</div><div class="pcat">${esc(p.category)}</div></div></div>
      <p class="muted small" style="min-height:34px">${esc(p.shortDescription)}</p>
      <div class="row">
        <span class="stars">${stars(p.rating.avg)}</span>
        <span class="tiny muted">${p.rating.n ? `${p.rating.avg} · ${p.rating.n} ${t("reviews")}` : ""}</span>
      </div>
      <div class="between">
        <div class="row"><span class="price-now text-gold">${money(p.price.amount, p.price.currency)}</span>
        ${p.price.original > p.price.amount ? `<span class="price-was">${money(p.price.original, p.price.currency)}</span>` : ""}</div>
        <span class="tiny ${oos ? "muted" : ""}" style="color:${oos ? "" : "var(--green)"}">${oos ? t("out_of_stock") : `${p.stock} ${t("left")}`}</span>
      </div>
      <div class="row">
        <a class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" href="#/p/${esc(p.slug)}">${t("view")}</a>
        ${oos ? "" : `<a class="btn btn-gold btn-sm" style="flex:1;justify-content:center" href="#/checkout/${esc(p.slug)}">${t("buy")}</a>`}
      </div>
    </div>`;
  }).join("");
}
function refreshHomeGrid(chips = false) {
  const data = State.products; if (!data) return;
  const list = data.products.filter((p) =>
    (homeFilter.cat === "all" || p.category === homeFilter.cat) &&
    (!homeFilter.q || (p.title + p.category).toLowerCase().includes(homeFilter.q.toLowerCase())),
  );
  $("#productGrid").innerHTML = productCards(list);
  if (chips) {
    $("#catChips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("on",
      c.textContent === (homeFilter.cat === "all" ? t("all") : homeFilter.cat)));
  }
}

/* -------------------------- Product page -------------------------- */
route("/p/:slug", async (params) => {
  $("#app").innerHTML = spinnerPage();
  const [s, data] = await Promise.all([loadSettings(), api(`/products/${encodeURIComponent(params.slug)}?region=${State.region}`)]);
  const p = data.product;
  document.title = `${p.title} — ${s.brand.name}`;
  const oos = p.stock <= 0;
  return siteShell(`
  <div class="wrap mt-4">
    <a class="muted small" href="#/">← ${t("back_products")}</a>
    <div class="co-grid mt-3">
      <div class="stagger">
        <div class="glass" style="padding:26px">
          <div class="row">${plogoHtml(p)}
            <div>
              <h1 style="font-size:30px">${esc(p.title)}</h1>
              <div class="row mt-1"><span class="pcat">${esc(p.category)}</span>
                <span class="stars">${stars(p.rating.avg)}</span><span class="tiny muted">${p.rating.n} ${t("reviews")}</span></div>
            </div>
          </div>
          <p class="mt-3">${esc(p.description || p.shortDescription)}</p>
          ${p.features?.length ? `<div class="mt-3"><b class="small">${t("features")}</b>
            <ul class="mt-1" style="padding-left:18px">${p.features.map((f) => `<li class="small" style="margin:5px 0">✦ ${esc(f)}</li>`).join("")}</ul></div>` : ""}
          ${p.deliveryMethod ? `<p class="small muted mt-2">🚚 <b>${t("delivery_method")}:</b> ${esc(p.deliveryMethod)}</p>` : ""}
          ${p.terms ? `<p class="tiny muted mt-2">📄 <b>${t("terms")}:</b> ${esc(p.terms)}</p>` : ""}
        </div>

        <div class="glass mt-3" style="padding:26px">
          <span class="eyebrow">${t("reviews_title")}</span>
          <div class="grid mt-3">
            ${data.reviews.length ? data.reviews.map((r) => `
              <div style="border-bottom:1px solid var(--border);padding-bottom:12px">
                <div class="between"><b class="small">${esc(r.name)}</b><span class="stars">${stars(r.rating)}</span></div>
                ${r.text ? `<p class="small muted mt-1">${esc(r.text)}</p>` : ""}
              </div>`).join("") : `<p class="muted small">—</p>`}
          </div>
          <div class="mt-3">
            <b class="small">${t("write_review")}</b>
            <div class="row mt-2" style="flex-wrap:wrap">
              <input id="rvName" class="input" style="max-width:180px" placeholder="${t("full_name")}">
              <select id="rvRating" class="input" style="max-width:130px">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${"★".repeat(n)}</option>`).join("")}</select>
            </div>
            <textarea id="rvText" class="input mt-2" placeholder="${t("review_ph")}"></textarea>
            <button class="btn btn-ghost btn-sm mt-2" onclick="sendReview('${p.id}')">${t("send_review")}</button>
          </div>
        </div>
      </div>

      <aside class="sticky-side">
        <div class="holo-spin ticket">
          <div class="between"><span class="eyebrow">${t("order_ticket")}</span>
            <span class="tiny ${oos ? "muted" : ""}" style="color:${oos ? "" : "var(--green)"}">${oos ? t("out_of_stock") : `${p.stock} ${t("in_stock")}`}</span></div>
          <div class="row mt-3"><span class="price-now text-gold" style="font-size:30px">${money(p.price.amount, p.price.currency)}</span>
            ${p.price.original > p.price.amount ? `<span class="price-was">${money(p.price.original, p.price.currency)}</span>` : ""}</div>
          <div class="ticket-divider"></div>
          <p class="tiny muted">💳 bKash · Nagad · Easypaisa · JazzCash · Bank · Binance · USDT</p>
          ${oos ? `<button class="btn btn-ghost mt-3" style="width:100%" disabled>${t("out_of_stock")}</button>`
                : `<a class="btn btn-gold mt-3" style="width:100%" href="#/checkout/${esc(p.slug)}">${t("buy")} →</a>`}
        </div>
      </aside>
    </div>
  </div>`);
});

window.sendReview = async (productId) => {
  try {
    const res = await api("/reviews", { method: "POST", body: { productId, name: $("#rvName").value, rating: Number($("#rvRating").value), text: $("#rvText").value } });
    toast(res.message); $("#rvName").value = ""; $("#rvText").value = "";
  } catch (e) { toast(e.message, "err"); }
};

/* ---------------------------- Checkout ---------------------------- */
const CO = { product: null, gateway: null, channel: null, promo: null, busy: false };

route("/checkout/:slug", async (params) => {
  $("#app").innerHTML = spinnerPage("Preparing secure checkout…");
  const [s, data] = await Promise.all([loadSettings(), api(`/products/${encodeURIComponent(params.slug)}?region=${State.region}`)]);
  CO.product = data.product; CO.promo = null; CO.channel = null;
  const order = State.region === "bd" ? ["bangladesh", "pakistan", "binance"]
              : State.region === "pk" ? ["pakistan", "binance", "bangladesh"]
              : ["binance", "pakistan", "bangladesh"];
  CO.gateways = order.filter((g) => s.payment[g]?.enabled !== false);
  CO.gateway = CO.gateways[0];
  document.title = `${t("checkout")} — ${s.brand.name}`;
  if (CO.product.stock <= 0) {
    return siteShell(`<div class="wrap mt-5 center"><div class="glass pop" style="padding:34px;max-width:460px;margin:0 auto">
      <div style="font-size:40px">📦</div><h2 class="mt-2">${t("out_of_stock")}</h2>
      <p class="muted mt-2">${esc(CO.product.title)}</p>
      <a class="btn btn-gold mt-3" href="#/">${t("back_products")}</a></div></div>`);
  }
  return siteShell(checkoutHtml(s));
});

function coRegion() { return { bangladesh: "bd", pakistan: "pk", binance: "world" }[CO.gateway]; }
function coPrice() { return CO.product.pricing[coRegion() === "bd" ? "bd" : coRegion() === "pk" ? "pk" : "world"]; }
function coDiscount() { return CO.promo ? Math.min(CO.promo.discount, coPrice().amount) : 0; }
function coTotal() { const p = coPrice(); return Math.max(0, Math.round((p.amount - coDiscount()) * 100) / 100); }

function checkoutHtml(s) {
  const p = CO.product;
  return `
  <div class="wrap mt-4">
    <a class="muted small" href="#/p/${esc(p.slug)}">← ${esc(p.title)}</a>
    <div class="between mt-2 rise">
      <div>
        <span class="eyebrow">${t("checkout")}</span>
        <h1 style="font-size:clamp(26px,4vw,38px)" class="mt-1">${t("checkout").split(" ")[0]} <em class="text-holo">${t("checkout").split(" ").slice(1).join(" ")}</em></h1>
        <p class="muted small mt-1" style="max-width:560px">${t("checkout_sub")}</p>
      </div>
      <div class="progress-rail" id="coRail">${railHtml()}</div>
    </div>

    <div class="co-grid mt-3">
      <div class="stagger">
        <div class="glass" style="padding:22px">
          <div class="row"><span class="pnode active" id="secDot1">1</span><b style="letter-spacing:.1em;text-transform:uppercase;font-size:13px">${t("your_info")}</b></div>
          <div class="grid-2 mt-3">
            <label class="field"><span>${t("full_name")}</span><input id="coName" class="input" oninput="coRefresh()"></label>
            <label class="field"><span>${t("email")}</span><input id="coEmail" type="email" class="input" oninput="coRefresh()"></label>
          </div>
          <label class="field mt-2"><span>${t("contact_opt")}</span><input id="coContact" class="input" placeholder="+8801XXXXXXXXX / @username"></label>
          <p class="tiny muted mt-2">${t("info_hint")}</p>
        </div>

        <div class="glass mt-3" style="padding:22px">
          <div class="row"><span class="pnode active" id="secDot2">2</span><b style="letter-spacing:.1em;text-transform:uppercase;font-size:13px">${t("choose_pay")}</b></div>
          <p class="tiny muted mt-1">${t("choose_pay_hint")}</p>
          <div class="grid-3 mt-3" id="gwTabs">${gatewayTabs()}</div>
          <div class="mt-3">
            <span class="tiny muted" style="font-weight:700">${t("select_wallet")}</span>
            <div class="grid-3 mt-1" id="walletList">${walletButtons()}</div>
          </div>
          <div id="walletPanel" class="mt-3">${walletPanelHtml(s)}</div>
        </div>

        <button id="coSubmit" class="btn btn-gold mt-3" style="width:100%;padding:15px" onclick="coSubmit()" disabled>🛡️ ${t("submit")}</button>
        <p class="tiny muted center mt-1" id="coHint">${t("need_name")}</p>
      </div>

      <aside class="sticky-side">
        <div class="holo-spin ticket">
          <span class="eyebrow">🎟 ${t("order_ticket")}</span>
          <div class="row mt-3">${plogoHtml(p)}<div><b>${esc(p.title)}</b><div class="pcat">${esc(p.category)}</div></div></div>
          <div class="mt-3" id="promoBox">${promoBoxHtml()}</div>
          <div class="mt-3" id="totals">${totalsHtml()}</div>
          <p class="tiny mt-3" style="color:var(--green)">🛡️ ${t("guarantee")}</p>
        </div>
      </aside>
    </div>
  </div>`;
}

function railHtml() {
  const infoDone = !!($("#coName")?.value.trim() && $("#coEmail")?.value.trim());
  const payDone = !!(CO.channel && $("#coTrx")?.value.trim());
  const st = [infoDone ? "done" : "active", payDone ? "done" : infoDone ? "active" : "", ""];
  const labels = [t("step_info"), t("step_pay"), t("step_done")];
  return labels.map((l, i) => `
    ${i ? `<span class="pline ${st[i - 1] === "done" ? "done" : ""}"></span>` : ""}
    <span style="display:grid;justify-items:center;gap:3px">
      <span class="pnode ${st[i]}">${st[i] === "done" ? "✓" : i + 1}</span>
      <span class="tiny muted" style="white-space:nowrap">${l}</span>
    </span>`).join("");
}

function gatewayTabs() {
  return CO.gateways.map((g) => {
    const meta = GATEWAYS[g];
    return `<button class="wallet-cta ${CO.gateway === g ? "on" : ""}" onclick="coSetGateway('${g}')">
      <span style="font-size:20px">${meta.flag}</span>
      <span><b class="small">${meta.title}</b><br><span class="tiny muted">${meta.sub}</span></span>
      ${CO.gateway === g ? `<span style="margin-left:auto;color:var(--gold)">✓</span>` : ""}
    </button>`;
  }).join("");
}

function walletButtons() {
  return Object.entries(WALLETS).filter(([, w]) => w.gateway === CO.gateway).map(([key, w]) => `
    <button class="wallet-cta ${CO.channel === key ? "on" : ""}" style="--w:${w.color};--w2:${w.color2};--wink:${w.ink}" onclick="coSetChannel('${key.replace(/'/g, "\\'")}')">
      <span class="wallet-chip">${w.mono}</span>
      <span><b class="small">${w.label}</b><br><span class="tiny muted">${w.badge}</span></span>
      ${CO.channel === key ? `<span style="margin-left:auto;color:${w.color}">✓</span>` : ""}
    </button>`).join("");
}

function walletPanelHtml(s) {
  if (!CO.channel) return "";
  const w = WALLETS[CO.channel];
  const gw = s.payment[CO.gateway] || {};
  const number = gw[w.field] || "";
  const price = coPrice();
  const bn = State.lang === "bn";
  return `
  <div class="wallet-panel" style="--w:${w.color};--w2:${w.color2};--wink:${w.ink}">
    <div class="between">
      <div class="row"><span class="wallet-chip">${w.mono}</span><div><b>${w.label} Checkout</b><div class="tiny muted">${esc(number ? "" : t("not_set"))}</div></div></div>
      <span class="wallet-badge">${w.badge}</span>
    </div>
    <button type="button" class="copy-number" onclick="copyText('${esc(number)}')" ${number ? "" : "disabled"}>
      <span class="num">${esc(number || t("not_set"))}</span>
      <span class="copy-tag">⧉ ${t("tap_copy")}</span>
    </button>
    <div class="amount-line"><span class="tiny muted" style="font-weight:700;letter-spacing:.1em;text-transform:uppercase">${t("send_exactly")}</span>
      <b class="mono" style="color:${w.color2};font-size:18px" id="amountLine">${money(coTotal(), price.currency)}</b></div>
    <div class="mt-3">
      <div class="tiny" style="font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${w.color}">✦ ${t("how_to_pay")}</div>
      <div class="grid mt-2" style="gap:8px">
        ${w.steps.map((st, i) => `<div class="step-card"><span class="step-dot">${i + 1}</span>
          <span>${esc(bn && w.stepsBn[i] ? w.stepsBn[i] : st)}${bn || !w.stepsBn[i] ? "" : `<br><span class="tiny muted">${esc(w.stepsBn[i])}</span>`}</span></div>`).join("")}
      </div>
    </div>
    ${gw.instructions ? `<p class="tiny muted mt-3" style="background:rgba(0,0,0,.18);padding:11px 14px;border-radius:12px">${esc(gw.instructions)}</p>` : ""}
    <div class="grid-2 mt-3">
      <label class="field"><span>${esc(w.proof)}</span><input id="coTrx" class="input mono" placeholder="${esc(w.hint)}" oninput="coRefresh()"></label>
      <label class="field"><span>${t("your_ref")}</span><input id="coRef" class="input"></label>
    </div>
  </div>`;
}

function promoBoxHtml() {
  if (CO.promo) {
    return `<div class="promo-ok"><span>🏷️ <b class="mono">${esc(CO.promo.code)}</b>
      ${CO.promo.discountType === "percent" ? `<span class="tiny">(-${CO.promo.percentOff}%)</span>` : ""}</span>
      <button class="btn-sm" style="color:var(--muted)" onclick="coRemovePromo()">✕ ${t("remove")}</button></div>`;
  }
  return `<label class="field"><span>${t("promo_q")}</span>
    <div class="row"><input id="coPromo" class="input mono" style="text-transform:uppercase" placeholder="WELCOME10"
      onkeydown="if(event.key==='Enter'){event.preventDefault();coApplyPromo()}">
    <button class="btn btn-gold btn-sm" id="promoBtn" onclick="coApplyPromo()">${t("apply")}</button></div></label>`;
}

function totalsHtml() {
  const price = coPrice();
  const d = coDiscount();
  return `
  <div class="between small muted"><span>${t("subtotal")}</span><span style="color:var(--text)">${money(price.amount, price.currency)}</span></div>
  ${d ? `<div class="between small" style="color:var(--green)"><span>${t("you_save")} (${esc(CO.promo.code)})</span><span>− ${money(d, price.currency)}</span></div>` : ""}
  <div class="between small muted mt-1"><span>${t("service_fee")}</span><span style="color:var(--text)">${money(0, price.currency)}</span></div>
  <div class="ticket-divider"></div>
  <div class="between"><b>${t("total")}</b><b class="text-gold" style="font-family:var(--font-display);font-size:22px">${money(coTotal(), price.currency)}</b></div>`;
}

window.coSetGateway = async (g) => {
  CO.gateway = g; CO.channel = null;
  $("#gwTabs").innerHTML = gatewayTabs();
  $("#walletList").innerHTML = walletButtons();
  $("#walletPanel").innerHTML = "";
  if (CO.promo) { // re-validate for new currency/region
    try { CO.promo = await api("/promo/validate", { method: "POST", body: { code: CO.promo.code, productId: CO.product.id, region: coRegion() } }); }
    catch { CO.promo = null; toast("Promo removed — not valid for this region.", "err"); }
    $("#promoBox").innerHTML = promoBoxHtml();
  }
  $("#totals").innerHTML = totalsHtml();
  coRefresh();
};
window.coSetChannel = (key) => {
  CO.channel = key;
  $("#walletList").innerHTML = walletButtons();
  $("#walletPanel").innerHTML = walletPanelHtml(State.settings);
  coRefresh();
};
window.coApplyPromo = async () => {
  const code = $("#coPromo")?.value.trim(); if (!code) return;
  const btn = $("#promoBtn"); btn.textContent = t("checking"); btn.disabled = true;
  try {
    CO.promo = await api("/promo/validate", { method: "POST", body: { code, productId: CO.product.id, region: coRegion() } });
    toast(`✔ ${CO.promo.code}`);
    $("#promoBox").innerHTML = promoBoxHtml();
  } catch (e) {
    toast(e.message, "err");
    const box = $("#promoBox"); box.classList.add("shake"); setTimeout(() => box.classList.remove("shake"), 450);
    btn.textContent = t("apply"); btn.disabled = false;
  }
  $("#totals").innerHTML = totalsHtml();
  const a = $("#amountLine"); if (a) a.textContent = money(coTotal(), coPrice().currency);
};
window.coRemovePromo = () => {
  CO.promo = null;
  $("#promoBox").innerHTML = promoBoxHtml();
  $("#totals").innerHTML = totalsHtml();
  const a = $("#amountLine"); if (a) a.textContent = money(coTotal(), coPrice().currency);
};
window.coRefresh = () => {
  const infoDone = !!($("#coName")?.value.trim() && $("#coEmail")?.value.trim());
  const trxDone = !!$("#coTrx")?.value.trim();
  const ready = infoDone && CO.channel && trxDone;
  $("#coSubmit").disabled = !ready || CO.busy;
  $("#coHint").textContent = ready ? "" : !infoDone ? t("need_name") : !CO.channel ? t("need_wallet") : t("need_trx");
  $("#coRail").innerHTML = railHtml();
  const d1 = $("#secDot1"); if (d1) { d1.className = "pnode " + (infoDone ? "done" : "active"); d1.textContent = infoDone ? "✓" : "1"; }
  const d2 = $("#secDot2"); if (d2) { d2.className = "pnode " + (CO.channel && trxDone ? "done" : "active"); d2.textContent = CO.channel && trxDone ? "✓" : "2"; }
};
window.coSubmit = async () => {
  if (CO.busy) return;
  CO.busy = true;
  const btn = $("#coSubmit"); btn.disabled = true; btn.textContent = "⏳ " + t("submitting");
  try {
    const res = await api("/orders", {
      method: "POST",
      body: {
        productId: CO.product.id, gateway: CO.gateway, channel: CO.channel,
        name: $("#coName").value, email: $("#coEmail").value, contact: $("#coContact").value,
        transactionId: $("#coTrx").value, customerRef: $("#coRef")?.value || "",
        promoCode: CO.promo?.code || "",
      },
    });
    saveOrderToken(res.order.orderId, res.accessToken);
    location.hash = `#/order/${res.order.orderId}?placed=1`;
  } catch (e) {
    toast(e.message, "err");
    CO.busy = false; btn.disabled = false; btn.textContent = "🛡️ " + t("submit");
  }
};

/* --------------------------- Order status --------------------------- */
route("/order/:orderId", async (params, query) => {
  $("#app").innerHTML = spinnerPage();
  await loadSettings();
  const token = State.orderTokens[params.orderId] || query.token || "";
  const data = await api(`/orders/${encodeURIComponent(params.orderId)}${token ? `?token=${encodeURIComponent(token)}` : ""}`);
  if (query.token && !State.orderTokens[params.orderId]) saveOrderToken(params.orderId, query.token);
  const o = data.order;
  document.title = `${o.orderId} — ${State.settings.brand.name}`;
  const link = `${location.origin}/#/order/${o.orderId}?token=${encodeURIComponent(token)}`;
  return siteShell(`
  <div class="wrap mt-4" style="max-width:760px">
    ${query.placed ? `<div class="glass pop center" style="padding:26px">
      <div style="font-size:44px">🎉</div><h2 class="mt-1">${t("order_placed")}</h2>
      <p class="muted small mt-2">${t("save_link")}</p>
      <div class="row mt-2" style="justify-content:center;flex-wrap:wrap">
        <code class="mono tiny" style="background:rgba(0,0,0,.3);padding:8px 12px;border-radius:9px;word-break:break-all">${esc(link)}</code>
        <button class="btn btn-ghost btn-sm" onclick="copyText('${esc(link)}')">⧉ ${t("copy_link")}</button>
      </div></div>` : ""}

    <div class="glass mt-3 rise" style="padding:26px">
      <div class="between">
        <div class="row"><span style="font-size:30px">${esc(o.icon || "✨")}</span>
          <div><b>${esc(o.title)}</b><div class="tiny muted mono">${esc(o.orderId)}</div></div></div>
        ${statusBadge(o.status)}
      </div>
      <div class="grid-3 mt-3 small">
        <div><span class="tiny muted">${t("total")}</span><br><b class="text-gold">${money(o.amount, o.currency)}</b>
          ${o.promoDiscount ? `<span class="tiny" style="color:var(--green)"> (−${money(o.promoDiscount, o.currency)} ${esc(o.promoCode)})</span>` : ""}</div>
        <div><span class="tiny muted">Gateway</span><br><b>${esc(o.channel || o.gateway)}</b></div>
        <div><span class="tiny muted">TrxID</span><br><b class="mono">${esc(o.transactionId)}</b></div>
      </div>
      ${o.status === "rejected" && o.rejectReason ? `<p class="small mt-3" style="color:var(--red)">✕ ${esc(o.rejectReason)}</p>` : ""}

      <div class="mt-4">
        <span class="eyebrow">Timeline</span>
        <div class="timeline mt-2">
          ${o.timeline.map((tl, i) => `
          <div class="tl-item">
            <div class="tl-rail"><span class="tl-dot"></span>${i < o.timeline.length - 1 ? `<span class="tl-line"></span>` : ""}</div>
            <div style="padding-bottom:14px"><b class="small" style="text-transform:capitalize">${esc(tl.status)}</b>
              <span class="tiny muted"> · ${dt(tl.at)}</span>
              ${tl.note ? `<div class="tiny muted">${esc(tl.note)}</div>` : ""}</div>
          </div>`).join("")}
        </div>
      </div>

      ${o.delivery ? `
      <div class="reveal-box mt-3 pop">
        <div class="between"><b style="color:var(--green)">🔓 ${t("delivery_title")}</b>
          <button class="btn btn-ghost btn-sm" onclick="const el=document.getElementById('creds');el.classList.toggle('hidden');this.textContent=el.classList.contains('hidden')?'${t("show")}':'${t("hide")}'">${t("show")}</button></div>
        <div id="creds" class="hidden mt-2 grid" style="gap:8px">
          ${o.delivery.email ? credRow("Email", o.delivery.email) : ""}
          ${o.delivery.password ? credRow("Password", o.delivery.password) : ""}
          ${o.delivery.extra ? credRow("Extra", o.delivery.extra) : ""}
          ${o.delivery.instructions ? `<p class="small muted" style="white-space:pre-wrap">${esc(o.delivery.instructions)}</p>` : ""}
        </div>
      </div>` : o.deliveryReady ? `<p class="small mt-3" style="color:var(--amber)">🔑 Delivery is ready — open this page with your saved order link (token) to reveal it.</p>` : ""}
    </div>
  </div>`);
});
function credRow(label, value) {
  return `<div class="between" style="background:rgba(0,0,0,.25);padding:9px 13px;border-radius:11px">
    <span class="tiny muted">${label}</span>
    <span class="row"><b class="mono small">${esc(value)}</b>
    <button class="btn-sm" style="color:var(--gold)" onclick="copyText('${esc(value).replace(/'/g, "\\'")}')">⧉</button></span></div>`;
}

/* ------------------------------ Track ------------------------------ */
route("/track", async () => {
  await loadSettings();
  document.title = `${t("track_title")} — ${State.settings.brand.name}`;
  return siteShell(`
  <div class="wrap mt-5" style="max-width:640px">
    <div class="glass rise" style="padding:30px">
      <span class="eyebrow">🔎 ${t("track_title")}</span>
      <p class="muted small mt-2">${t("track_sub")}</p>
      <div class="row mt-3">
        <input id="trackCode" class="input mono" placeholder="AM-20260101-XXXX / TrxID"
          onkeydown="if(event.key==='Enter')doTrack()">
        <button class="btn btn-gold" onclick="doTrack()">${t("track_btn")}</button>
      </div>
      <div id="trackResults" class="grid mt-3"></div>
    </div>
  </div>`);
});
window.doTrack = async () => {
  const code = $("#trackCode").value.trim(); if (!code) return;
  const box = $("#trackResults"); box.innerHTML = `<div class="spinner"></div>`;
  try {
    const data = await api("/track", { method: "POST", body: { code } });
    box.innerHTML = data.results.length ? data.results.map((o) => `
      <a class="glass" style="padding:16px;display:block" href="#/order/${esc(o.orderId)}">
        <div class="between"><b class="mono small">${esc(o.orderId)}</b>${statusBadge(o.status)}</div>
        <div class="tiny muted mt-1">${esc(o.title)} · ${money(o.amount, o.currency)} · ${dt(o.createdAt)}</div>
      </a>`).join("") : `<p class="muted small">No order found for that code.</p>`;
  } catch (e) { box.innerHTML = `<p class="small" style="color:var(--red)">${esc(e.message)}</p>`; }
};
