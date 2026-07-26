# 🎨 CUSTOMIZE GUIDE — সব সহজে বদলানোর গাইড

এই ফাইলে দেখানো আছে কোন জিনিস কোথা থেকে বদলাবেন। কোড না জানলেও পারবেন।
(Everything you may want to change, and exactly where to change it.)

---

## 1) দোকানের নাম / Brand name & tagline

**ফাইল:** `src/lib/brand.ts`

```ts
export const BRAND = {
  name: "AIMarket",        // ← পুরো নাম
  nameAccent: "AI",        // ← নামের যেই অংশ গ্রেডিয়েন্ট রঙে দেখাবে
  nameRest: "Market",      // ← বাকি অংশ
  tagline: "Premium AI, delivered fast.",
  ...
};
```

নাম বদলালে লোগো, হেডার, ফুটার, অ্যাডমিন প্যানেল, ব্রাউজার ট্যাব — সব জায়গায় একসাথে বদলে যাবে।

## 2) WhatsApp সাপোর্ট নাম্বার / Support numbers

**ফাইল:** `src/lib/brand.ts` → `SUPPORT` অবজেক্ট। শুধু `href`-এর ভেতরের ফোন নাম্বার বদলান:

```
https://api.whatsapp.com/send?phone=8801XXXXXXXXX
```

## 3) রঙ / Colors (theme)

**ফাইল:** `src/styles.css` → উপরের `:root { ... }` ব্লক।

| Token | কী কাজ করে |
|---|---|
| `--background` | পুরো সাইটের ব্যাকগ্রাউন্ড |
| `--primary` | ব্র্যান্ড ভায়োলেট (বাটন, অ্যাক্টিভ ট্যাব) |
| `--accent` | সায়ান (আইকন, হাইলাইট) |
| `--gold` | দাম/প্রিমিয়াম ব্যাজের সোনালি রঙ |
| `--success / --warning / --destructive` | সবুজ / হলুদ / লাল স্ট্যাটাস |

`--gradient-primary` বদলালে সব গ্রেডিয়েন্ট বাটন একসাথে বদলাবে।

## 4) ফন্ট / Fonts

- **লোড হয়:** `src/routes/__root.tsx` → Google Fonts লিংক
- **সেট হয়:** `src/styles.css` → `--font-display` (হেডলাইন/দাম), `--font-sans` (বডি), `--font-mono` (অর্ডার আইডি/নাম্বার)

বর্তমান: **Unbounded** (display) · **Manrope** (body) · **JetBrains Mono** (IDs)

## 5) লোগো / Logo

- **সাইটের ভেতরের লোগো (SVG):** `src/components/brand-logo.tsx` — `BrandMark` কম্পোনেন্ট
- **ব্রাউজার ট্যাব আইকন:** `public/favicon.png`, `public/favicon.ico`, `public/apple-touch-icon.png` — নিজের ছবি দিয়ে replace করলেই হবে

## 6) হোমপেজের লেখা / Homepage text

**ফাইল:** `src/routes/index.tsx`
- হিরো হেডলাইন, সাবটাইটেল
- `TICKER` array — চলমান (marquee) লেখাগুলো
- "How it works" ৩টি স্টেপ
- Trust কার্ড ৪টি

## 7) Backend URL

**ফাইল:** `src/lib/api.ts` → `DEFAULT_API_BASE_URL`, অথবা `.env`-এ `VITE_API_BASE_URL` দিন। Backend (aimarket-main) কোনো পরিবর্তন ছাড়াই আগের মতোই কানেক্ট হবে।

## 8) Run / Deploy

```bash
bun install     # অথবা npm install
bun run dev     # লোকালে চালাতে
bun run build   # প্রোডাকশন বিল্ড
```

---

### Motion বন্ধ করতে চাইলে?
কারো ডিভাইসে **Reduce Motion** অন থাকলে সব অ্যানিমেশন নিজে থেকেই বন্ধ হয়ে যায় — আলাদা কিছু করা লাগবে না।
