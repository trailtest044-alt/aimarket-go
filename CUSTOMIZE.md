# 🎛️ CUSTOMIZE GUIDE — সব কিছু কোথায় এডিট করবেন

এই প্রজেক্টের **সব লেখা, কালার, স্টেপ, ফন্ট** নিচের ফাইলগুলো থেকে বদলানো যায়।
কোড না জানলেও সমস্যা নেই — শুধু টেক্সট বদলে সেভ করুন।

---

## 1. `src/lib/brand.ts` — দোকানের নাম / ট্যাগলাইন / WhatsApp
- `name`, `nameAccent`, `nameRest` → লোগোর নাম
- `tagline`, `description` → ট্যাগলাইন ও Google-এ যা দেখাবে
- `SUPPORT` → WhatsApp সাপোর্ট নাম্বার

## 2. `src/lib/site-config.ts` — ⭐ চেকআউটের সব কিছু (নতুন)
- **`WALLETS`** → প্রতিটা ওয়ালেটের (bKash, Nagad, Easypaisa, JazzCash, Bank,
  Binance, USDT) ব্র্যান্ড কালার, monogram, badge, আর **স্টেপ-বাই-স্টেপ পেমেন্ট গাইড**
  (English `steps` + বাংলা `stepsBn`)। কালার বদলালে পুরো প্যানেলের থিম বদলে যাবে।
- **`METHOD_CHANNELS`** → কোন গেটওয়েতে কোন ওয়ালেট দেখাবে
- **`PROMO_TEXT`** → প্রোমো কোড বক্সের সব লেখা
- **`CHECKOUT_TEXT`** → চেকআউট পেজের টাইটেল, হিন্ট, বাটনের লেখা

## 3. `src/styles.css` — কালার / ফন্ট / এনিমেশন (Royal Obsidian theme)
- `:root`-এর ভেতরে `--primary` (গোল্ড), `--accent`, `--background` ইত্যাদি
- ফন্ট: `--font-display` (Fraunces), `--font-sans` (Albert Sans + Hind Siliguri)
- ফন্ট বদলাতে চাইলে `src/routes/__root.tsx`-এর Google Fonts লিংকও আপডেট করুন
- নিচের **PREMIUM V2** ব্লকে wallet-panel, holo-border, ticket, step-card স্টাইল

## 4. Admin Panel থেকে (কোড ছাড়াই)
- **Payment Settings** → bKash / Nagad / Easypaisa / JazzCash / Bank / Binance নাম্বার + instructions
- **Promo Codes (নতুন)** → প্রোমো কোড বানান:
  - `% Percent off` বা `Fixed amount off` (BDT/PKR/USDT আলাদা)
  - Max uses, Min order amount, Start/Expiry date
  - নির্দিষ্ট প্রোডাক্টে লিমিট করা যায়, on/off toggle
- Products, Stock, Orders আগের মতোই

## 5. Backend (aimarket repo) — নতুন API
- `POST /api/promo/validate` → চেকআউটে কোড চেক করে
- `POST /api/orders` এখন `promoCode` নেয়; ডিসকাউন্ট **সার্ভারে আবার ভেরিফাই** হয়
- `/api/admin/promo-codes` → list / create / update / status / delete

> ⚠️ ফ্রন্টএন্ড আর ব্যাকএন্ড **দুটোই** নতুন ভার্সনে ডিপ্লয় করতে হবে,
> নাহলে প্রোমো কোড কাজ করবে না।
