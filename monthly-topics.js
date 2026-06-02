import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Monthly Content Calendar (Phase 4B)
// Runs on 1st of each month via GitHub Actions
// Generates 90 topics → saves to topics.json
// post.js reads topics.json if it exists
// ============================================

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const TOPICS_FILE = "./topics.json";
const SEO_YEAR    = 2026;

const API_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") throw new Error(`Timeout after ${timeoutMs}ms`);
    throw err;
  }
}

async function callGemini(prompt, maxTokens = 3000) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
      })
    },
    API_TIMEOUT_MS
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function getNextMonthInfo() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    year:  next.getFullYear(),
    month: next.getMonth() + 1,
    name:  next.toLocaleString("en-IN", { month: "long" }),
    season: getIndianSeason(next.getMonth() + 1)
  };
}

function getIndianSeason(month) {
  if ([3, 4, 5].includes(month)) return "Summer (hot, humid — focus on cooling, hydration, outdoor gear)";
  if ([6, 7, 8, 9].includes(month)) return "Monsoon (rain season — focus on indoor, waterproof, home products)";
  if ([10, 11].includes(month)) return "Post-monsoon/Festive (Navratri, Diwali, Dussehra — gifting season)";
  if ([12, 1, 2].includes(month)) return "Winter (focus on warmth, indoor wellness, year-end deals)";
  return "Spring transition";
}

function getUpcomingFestivals(month) {
  const festivals = {
    1:  "Makar Sankranti, Republic Day sales",
    2:  "Valentine's Day, Budget season",
    3:  "Holi, women's day gifting",
    4:  "IPL season, summer sales",
    5:  "Mother's Day, summer deals",
    6:  "Father's Day, monsoon preps",
    7:  "Monsoon sales, Amazon Prime Day",
    8:  "Independence Day sales, Rakshabandhan",
    9:  "Onam, Amazon Great Indian Festival",
    10: "Navratri, Dussehra, Diwali sales",
    11: "Diwali, Bhai Dooj, Children's Day",
    12: "Christmas, New Year, year-end sales"
  };
  return festivals[month] || "General shopping season";
}

// ============================================
// SPECIFIC-PRODUCT GATE
// Mirrors resolveProductIdentity() in post.js so the generated calendar only
// contains specific named products (brand + model), never generic categories.
// A topic qualifies if it has a brand field, or a model number / known brand in
// the name. (No ASIN is requested — asking Gemini for ASINs invites fabrication.)
// ============================================
const KNOWN_PRODUCT_BRANDS = [
  "realme", "cmf", "boat", "noise", "redmi", "xiaomi", "ambrane", "fire-boltt",
  "fire boltt", "fireboltt", "portronics", "zebronics", "ant esports", "syska", "lego"
];

function isSpecificProduct(t) {
  if (t.brand && String(t.brand).trim()) return true;
  const name = ` ${(t.product || "").toLowerCase()} `;
  if (/\d/.test(name)) return true;
  if (KNOWN_PRODUCT_BRANDS.some(b => name.includes(` ${b} `))) return true;
  return false;
}

// Parse the JSON array of topics from the model output. If the response was
// truncated mid-array (e.g. it hit the output-token cap), salvage it by keeping
// only the complete objects: trim to the last "}", drop a trailing comma, and
// close the array. This turns a hard crash into a usable (slightly shorter) list.
function parseTopicsArray(raw) {
  const start = raw.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");
  const body = raw.slice(start);

  // 1) Happy path: a well-formed array from the first "[" to the last "]".
  const full = body.match(/\[[\s\S]*\]/);
  if (full) {
    try { return JSON.parse(full[0]); } catch { /* truncated/invalid → salvage below */ }
  }

  // 2) Salvage path: keep everything up to the last complete object.
  const lastObjEnd = body.lastIndexOf("}");
  if (lastObjEnd === -1) throw new Error("No complete objects to salvage from response");
  const salvaged = body.slice(0, lastObjEnd + 1).replace(/,\s*$/, "") + "\n]";
  const parsed = JSON.parse(salvaged);
  console.log(`⚠️  Model output was truncated — salvaged ${parsed.length} complete topic(s).`);
  return parsed;
}

async function main() {
  console.log("📅 Teja Reviews — Monthly Content Calendar Generator");
  console.log("======================================================");

  if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

  const nextMonth = getNextMonthInfo();
  console.log(`📆 Generating topics for: ${nextMonth.name} ${nextMonth.year}`);
  console.log(`🌦️  Season: ${nextMonth.season}`);
  console.log(`🎉 Festivals: ${getUpcomingFestivals(nextMonth.month)}`);

  const prompt = `You are a content strategist for Teja Reviews (tejareviews.in), an Indian affiliate review blog.

Generate exactly 90 product topics for ${nextMonth.name} ${nextMonth.year}.

CONTEXT:
- Season: ${nextMonth.season}
- Upcoming events: ${getUpcomingFestivals(nextMonth.month)}
- Target: Indian buyers, Amazon India affiliate links
- Mix (IMPORTANT): exactly 50% Electronics and 50% Beauty & Personal Care
- Avoid entirely: mobiles/smartphones, laptops, tablets, TVs (very low ~0.5% Amazon commission and unwinnable competition)
- Focus on: ₹500–₹15,000 price range products with high search volume

CRITICAL — SPECIFIC PRODUCTS ONLY (no exceptions):
- Every entry MUST be a specific, real, currently-sold product with a brand AND a model name/number — NOT a generic category.
  ✅ GOOD: "boAt Airdopes 311 Pro", "Noise ColorFit Pro 5", "Ambrane 20000mAh Power Bank", "Lifelong LLM809 Yoga Mat"
  ❌ BAD (generic category): "Wireless Earbuds", "Smartwatch", "Yoga Mat", "Blush Makeup", "Power Bank"
- Only include products you are confident genuinely exist and are sold on Amazon India today.
  NEVER invent or fabricate a fictional product, brand, model number, or any identifier. If unsure a product is real, leave it out. This rule has no exceptions.
- The "brand" field must be the real manufacturer brand only (e.g. "boAt", "Noise", "Realme").

Return ONLY a valid JSON array of 90 objects. No preamble, no explanation, no code fences. Each object:
{
  "product": "Exact product name including brand and model (e.g. \"boAt Airdopes 311 Pro\")",
  "brand": "Manufacturer brand only (e.g. \"boAt\")",
  "productType": "Plural generic product category for buying guides (e.g. \"True Wireless Earbuds\", \"Security Cameras\", \"Niacinamide Serums\") — NOT the brand/model",
  "price": "₹XXX–₹X,XXX",
  "category": "Category Name",
  "imageQuery": "3-4 word pexels search term",
  "keywords": ["primary keyword india", "secondary keyword 2026", "tertiary keyword"]
}

Draw specific named products ONLY from these two halves (≈45 each):

ELECTRONICS (50%) — audio, wearables, accessories, smart home, gaming. NO mobiles/laptops/tablets/TVs:
- Tech & Audio (earbuds, headphones, Bluetooth speakers)
- Wearable Tech (smartwatches, fitness bands)
- Mobile Accessories (power banks, chargers, cables)
- Smart Home Tech (smart bulbs, plugs, security cams)
- Tech & Gaming (headsets, keyboards, controllers, mice)

BEAUTY & PERSONAL CARE (50%) — prefer ingredient-led skincare and spec-able grooming tools; use real Indian brands (Minimalist, Mamaearth, The Derma Co, Plum, Dot & Key, mCaffeine, Pilgrim, WOW, Cetaphil, etc.):
- Beauty & Skincare (serums, moisturisers, sunscreens, masks — name the active, e.g. "Minimalist Niacinamide 10%")
- Personal Care / Grooming Tools (hair dryers, straighteners, trimmers, electric toothbrushes)
- Hair Care (shampoos, hair oils, serums)
- Bath & Body (body lotions, washes, scrubs)

Keep categories ("category" field) accurate so same-category comparisons are possible.`;

  console.log("\n📡 Calling Gemini to generate 90 topics…");
  const raw = await callGemini(prompt, 8192);

  // Extract JSON from response — tolerant of truncated output (see parseTopicsArray)
  let topics;
  try {
    topics = parseTopicsArray(raw);
  } catch (err) {
    console.error("❌ Failed to parse Gemini JSON:", err.message);
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    process.exit(1);
  }

  if (!Array.isArray(topics) || topics.length < 10) {
    throw new Error(`Unexpected topics count: ${topics?.length}`);
  }

  // Validate and clean each topic
  const cleanedAll = topics.map(t => ({
    product:     (t.product     || "").trim(),
    brand:       (t.brand       || "").trim(),
    productType: (t.productType || "").trim(),
    price:       (t.price       || "₹500–₹5,000").trim(),
    category:    (t.category    || "Tech & Electronics").trim(),
    imageQuery:  (t.imageQuery  || "product review india").trim(),
    keywords:    Array.isArray(t.keywords) ? t.keywords.slice(0, 3).map(k => (k || "").trim()) : []
  })).filter(t => t.product.length > 0);

  // Drop any generic-category entries that slipped through, so post.js never
  // has to skip a review for "No specific product provided" (Issue 7).
  const cleaned = cleanedAll.filter(isSpecificProduct);
  const dropped = cleanedAll.length - cleaned.length;
  if (dropped > 0) {
    console.log(`🧹 Dropped ${dropped} generic-category topic(s); ${cleaned.length} specific products kept`);
  }
  if (cleaned.length < 10) {
    throw new Error(`Too few specific products after filtering (${cleaned.length}). Aborting to avoid overwriting topics.json with a thin list.`);
  }

  const output = {
    generatedFor: `${nextMonth.name} ${nextMonth.year}`,
    generatedAt:  new Date().toISOString(),
    season:       nextMonth.season,
    festivals:    getUpcomingFestivals(nextMonth.month),
    count:        cleaned.length,
    topics:       cleaned
  };

  fs.writeFileSync(TOPICS_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Generated ${cleaned.length} topics for ${nextMonth.name} ${nextMonth.year}`);
  console.log(`💾 Saved to ${TOPICS_FILE}`);
  console.log(`\nSample topics:`);
  cleaned.slice(0, 5).forEach((t, i) => console.log(`  ${i+1}. ${t.product} [${t.brand || "—"}] (${t.price}) — ${t.category}`));
}

main().catch(err => {
  console.error("❌ Monthly topics failed:", err.message);
  process.exit(1);
});
