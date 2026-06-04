import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Gemini Auto Poster v5
// Site: tejareviews.in | Affiliate: maruthiteja-21
// Post Types: review | buying_guide | comparison
// Phase 1: 3 posts/day  Phase 2: FAQ + internal links + IndexNow
// ============================================

const WORDPRESS_URL  = "https://tejareviews.in";
const WP_USERNAME    = "maruthiteja456@gmail.com";
const WP_APP_PASS    = process.env.WP_APP_PASSWORD || process.env.WP_PASS;
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const INDEXNOW_KEY   = process.env.INDEXNOW_KEY;
const AFFILIATE_TAG  = "maruthiteja-21";
const HISTORY_FILE   = "./posted.json";
const SEO_YEAR       = 2026;
const POST_TYPE      = process.env.POST_TYPE || "review"; // review | buying_guide | comparison

// Timeout & retry settings
const API_TIMEOUT_MS       = 60000;
const FETCH_TIMEOUT_MS     = 20000;
const GEMINI_RETRIES       = 5;
const GEMINI_INITIAL_DELAY = 5000;
const GEMINI_CALL_DELAY    = 4000; // between sequential Gemini calls (free-tier safety)

// ============================================
// PHASE 4 — TRENDING CONTEXT (1 Gemini call/day, cached)
// ============================================
const TRENDING_FILE = "./trending-context.json";

async function getTrendingContext() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (fs.existsSync(TRENDING_FILE)) {
      const cache = JSON.parse(fs.readFileSync(TRENDING_FILE, "utf-8"));
      if (cache.date === today && cache.context) {
        console.log(`📈 Using cached trending context (${today})`);
        return cache.context;
      }
    }
  } catch { /* ignore cache read errors */ }

  console.log(`📈 Fetching fresh trending context for ${today}…`);
  try {
    await new Promise(r => setTimeout(r, GEMINI_CALL_DELAY));
    const ctx = await callGemini(
      `You are a market analyst tracking Indian e-commerce trends on Amazon India and Flipkart.`,
      `What are the top trending consumer products being searched and bought in India right now in ${SEO_YEAR}?
List 5 specific products with their approximate INR price and why they are trending (new launch, viral, festival, season).
Format: 3-4 sentences of dense, specific context. Include product names, prices, and trends. No bullet points.`,
      300
    );
    try {
      fs.writeFileSync(TRENDING_FILE, JSON.stringify({ date: today, context: ctx }, null, 2));
    } catch { /* ignore write errors in CI */ }
    return ctx;
  } catch (err) {
    console.log(`⚠️  Trending context failed: ${err.message} — continuing without it`);
    return "";
  }
}

// ============================================
// 48 TRENDING PRODUCTS (2026) — mixed categories
// ============================================
const TOPICS = [
  {
    product:    "Yoga Mats",
    price:      "₹500–₹3,000",
    category:   "Fitness & Wellness",
    imageQuery: "yoga mat studio high quality",
    keywords:   ["yoga mat review India", "best yoga mat under 3000", "yoga mat thick eco-friendly"]
  },
  {
    product:    "Acne Patches",
    price:      "₹299–₹999",
    category:   "Beauty & Skincare",
    imageQuery: "acne patches skincare treatment close up",
    keywords:   ["acne patches India review", "best acne patches for cystic acne", "pimple patches 2026"]
  },
  {
    product:    "Protein Powder",
    price:      "₹800–₹2,500",
    category:   "Nutrition & Fitness",
    imageQuery: "protein powder whey isolate container",
    keywords:   ["best protein powder India", "whey protein powder under 2000", "protein powder review 2026"]
  },
  {
    product:    "Vitamin C Serum",
    price:      "₹599–₹3,500",
    category:   "Beauty & Skincare",
    imageQuery: "vitamin c serum amber bottle skincare",
    keywords:   ["vitamin c serum India review", "best vitamin c serum for skin", "vitamin c serum benefits"]
  },
  {
    product:    "Bluetooth Headphones",
    price:      "₹1,500–₹10,000",
    category:   "Tech & Audio",
    imageQuery: "wireless bluetooth headphones over ear black",
    keywords:   ["best bluetooth headphones India", "bluetooth headphones under 5000", "noise cancelling headphones"]
  },
  {
    product:    "Reusable Water Bottles",
    price:      "₹400–₹2,000",
    category:   "Lifestyle & Wellness",
    imageQuery: "insulated reusable water bottle steel",
    keywords:   ["best water bottle India", "insulated water bottle under 2000", "eco-friendly water bottle"]
  },
  {
    product:    "Wi-Fi Doorbell Cameras",
    price:      "₹2,999–₹8,999",
    category:   "Smart Home Tech",
    imageQuery: "smart wifi doorbell camera security",
    keywords:   ["doorbell camera India review", "smart doorbell camera under 5000", "wifi doorbell security"]
  },
  {
    product:    "Scalp Massagers",
    price:      "₹500–₹2,500",
    category:   "Wellness & Beauty",
    imageQuery: "electric scalp massager head relaxation",
    keywords:   ["scalp massager review India", "best scalp massager for hair growth", "electric scalp massager"]
  },
  {
    product:    "Under-Eye Patches",
    price:      "₹199–₹1,500",
    category:   "Beauty & Skincare",
    imageQuery: "under eye patches skincare puffiness",
    keywords:   ["under eye patches India", "best eye patches for dark circles", "eye patches review"]
  },
  {
    product:    "Home Décor Items",
    price:      "₹299–₹5,000",
    category:   "Home & Living",
    imageQuery: "modern home decor wall art pillow",
    keywords:   ["home decor ideas India", "affordable home decor 2026", "home decor products online"]
  },
  {
    product:    "Blush Makeup",
    price:      "₹599–₹2,000",
    category:   "Beauty & Cosmetics",
    imageQuery: "liquid blush makeup cream tones",
    keywords:   ["blush makeup India review", "best blush for Indian skin tone", "liquid blush 2026"]
  },
  {
    product:    "Wrap Skirts",
    price:      "₹799–₹3,000",
    category:   "Women's Fashion",
    imageQuery: "wrap skirt boho style fashion casual",
    keywords:   ["wrap skirt India online", "boho wrap skirt review", "best wrap skirt brands India"]
  },
  {
    product:    "Insulated Tumblers",
    price:      "₹1,200–₹3,500",
    category:   "Home & Kitchen",
    imageQuery: "insulated tumbler travel coffee cup stainless",
    keywords:   ["insulated tumbler India review", "best coffee tumbler under 3000", "vacuum tumbler 2026"]
  },
  {
    product:    "Teeth Whitening Strips",
    price:      "₹399–₹2,000",
    category:   "Personal Care",
    imageQuery: "teeth whitening strips dental care smile",
    keywords:   ["teeth whitening strips India", "best whitening strips safe", "teeth whitening review"]
  },
  {
    product:    "Pet Supplies",
    price:      "₹299–₹3,000",
    category:   "Pets",
    imageQuery: "premium pet supplies toys treats food",
    keywords:   ["pet supplies India online", "best pet food brands India", "dog treats review"]
  },
  {
    product:    "Gaming Headsets",
    price:      "₹1,999–₹8,000",
    category:   "Tech & Gaming",
    imageQuery: "gaming headset immersive sound rgb lights",
    keywords:   ["gaming headset India review", "best gaming headset under 5000", "gaming headphones 2026"]
  },
  {
    product:    "Ashwagandha Tea",
    price:      "₹299–₹1,200",
    category:   "Health & Wellness",
    imageQuery: "ashwagandha tea herbal wellness drink",
    keywords:   ["ashwagandha tea India review", "best ashwagandha tea brand", "adaptogen tea benefits"]
  },
  {
    product:    "Sauna Blankets",
    price:      "₹8,000–₹25,000",
    category:   "Home Wellness",
    imageQuery: "infrared sauna blanket relaxation wellness",
    keywords:   ["sauna blanket India review", "infrared sauna blanket benefits", "sauna blanket 2026"]
  },
  {
    product:    "Niacinamide Body Lotion",
    price:      "₹399–₹1,500",
    category:   "Beauty & Skincare",
    imageQuery: "niacinamide body lotion moisturizer bottle",
    keywords:   ["niacinamide lotion review", "best body lotion with niacinamide", "niacinamide skincare India"]
  },
  {
    product:    "Lash Cleansing Shampoo",
    price:      "₹499–₹1,200",
    category:   "Beauty & Haircare",
    imageQuery: "lash extension cleansing shampoo foam",
    keywords:   ["lash shampoo India review", "lash extension cleanser", "eyelash cleansing products"]
  },
  {
    product:    "LEGO Sets",
    price:      "₹1,500–₹15,000",
    category:   "Toys & Hobbies",
    imageQuery: "lego sets building kits adult collection",
    keywords:   ["LEGO sets India price", "best LEGO sets to buy", "LEGO collection 2026"]
  },
  {
    product:    "Foldable Chairs",
    price:      "₹1,500–₹8,000",
    category:   "Outdoor & Patio",
    imageQuery: "foldable camping chair portable lightweight",
    keywords:   ["foldable chair India review", "camping chair portable", "travel chair 2026"]
  },
  {
    product:    "Camping Hammocks",
    price:      "₹1,200–₹5,000",
    category:   "Outdoor & Recreation",
    imageQuery: "camping hammock portable outdoor travel",
    keywords:   ["camping hammock India review", "best hammock for camping", "portable hammock 2026"]
  },
  {
    product:    "Eyebrow Lamination Kits",
    price:      "₹799–₹3,000",
    category:   "Beauty & DIY",
    imageQuery: "eyebrow lamination kit diy home",
    keywords:   ["eyebrow lamination kit India", "DIY brow lamination", "eyebrow kit review"]
  },
  {
    product:    "Weighted Sleep Sacks",
    price:      "₹2,000–₹6,000",
    category:   "Kids & Baby",
    imageQuery: "weighted sleep sack baby infant comfort",
    keywords:   ["weighted sleep sack review", "baby sleep sack India", "infant sleep aid"]
  },
  {
    product:    "Bamboo Baby Pajamas",
    price:      "₹599–₹1,500",
    category:   "Kids & Baby",
    imageQuery: "bamboo baby pajamas soft eco-friendly",
    keywords:   ["bamboo baby pajamas India", "organic baby clothes", "eco-friendly baby wear"]
  },
  {
    product:    "Wireless Charging Desk Mat",
    price:      "₹1,299–₹5,000",
    category:   "Office Tech",
    imageQuery: "wireless charging desk mat workspace",
    keywords:   ["wireless charging pad India", "desk mat with charger", "office tech gadgets"]
  },
  {
    product:    "Embroidered Apparel",
    price:      "₹799–₹5,000",
    category:   "Fashion & Accessories",
    imageQuery: "embroidered clothing custom tshirt design",
    keywords:   ["embroidered tshirt India", "custom embroidered apparel", "personalized clothing"]
  },
  {
    product:    "Sustainable Kitchen Ware",
    price:      "₹199–₹2,000",
    category:   "Home & Kitchen",
    imageQuery: "eco-friendly kitchen glass straw reusable",
    keywords:   ["sustainable kitchen products India", "eco-friendly kitchenware", "glass straws review"]
  },
  {
    product:    "Disposable Period Underwear",
    price:      "₹899–₹2,500",
    category:   "Feminine Care",
    imageQuery: "period underwear menstrual care wellness",
    keywords:   ["period underwear India review", "menstrual underwear brands", "period care products"]
  },
  {
    product:    "Portable Ice Makers",
    price:      "₹3,000–₹10,000",
    category:   "Kitchen & Appliances",
    imageQuery: "portable ice maker machine automatic",
    keywords:   ["portable ice maker India review", "best ice maker for home", "portable ice machine"]
  },
  {
    product:    "Smart Light Bulbs",
    price:      "₹799–₹2,500",
    category:   "Smart Home Tech",
    imageQuery: "smart light bulb wifi rgb color",
    keywords:   ["smart light bulbs India", "wifi light bulb review", "smart lighting 2026"]
  },
  {
    product:    "Weighted Blankets",
    price:      "₹2,500–₹8,000",
    category:   "Sleep & Wellness",
    imageQuery: "weighted blanket sleep comfort cozy bed",
    keywords:   ["weighted blanket India review", "best weighted blanket for sleep", "gravity blanket"]
  },
  // ── Electronics batch (May 2026 trending) ──
  {
    product:    "Realme Buds Air 7",
    price:      "₹1,499–₹2,499",
    category:   "Tech & Audio",
    imageQuery: "wireless tws earbuds white compact premium",
    keywords:   ["realme buds air 7 review india", "best tws earbuds under 2500", "realme buds air 7 2026"]
  },
  {
    product:    "CMF Buds 2 Plus",
    price:      "₹1,999–₹2,999",
    category:   "Tech & Audio",
    imageQuery: "nothing cmf earbuds tws anc noise cancelling",
    keywords:   ["cmf buds 2 plus review india", "best earbuds with anc under 3000", "cmf nothing earbuds 2026"]
  },
  {
    product:    "Boat Nirvana Crown Earbuds",
    price:      "₹1,299–₹2,499",
    category:   "Tech & Audio",
    imageQuery: "boat earbuds tws active noise cancellation",
    keywords:   ["boat nirvana crown review india", "best boat earbuds 2026", "boat tws anc earbuds"]
  },
  {
    product:    "Noise Pro 6R Smartwatch",
    price:      "₹1,999–₹2,999",
    category:   "Wearable Tech",
    imageQuery: "noise smartwatch amoled display fitness health",
    keywords:   ["noise pro 6r review india", "best smartwatch under 3000 india 2026", "noise smartwatch amoled"]
  },
  {
    product:    "Redmi Watch 5 Active",
    price:      "₹1,499–₹2,499",
    category:   "Wearable Tech",
    imageQuery: "xiaomi redmi smartwatch fitness tracker slim",
    keywords:   ["redmi watch 5 active review india", "best smartwatch under 2000 india", "redmi watch 2026"]
  },
  {
    product:    "Boat Chrome Iris Smartwatch",
    price:      "₹1,499–₹2,299",
    category:   "Wearable Tech",
    imageQuery: "boat smartwatch amoled round bluetooth calling",
    keywords:   ["boat chrome iris review india", "best boat smartwatch under 2500", "boat amoled watch 2026"]
  },
  {
    product:    "Ambrane 20000mAh Power Bank",
    price:      "₹999–₹1,999",
    category:   "Mobile Accessories",
    imageQuery: "power bank 20000mah slim fast charging portable",
    keywords:   ["ambrane power bank review india", "best 20000mah power bank india 2026", "fast charging power bank"]
  },
  {
    product:    "Fire-Boltt Ninja Smartwatch",
    price:      "₹1,299–₹2,499",
    category:   "Wearable Tech",
    imageQuery: "fire boltt smartwatch bluetooth calling sports",
    keywords:   ["fire boltt ninja review india", "best smartwatch under 2000 india", "fire boltt ninja 2026"]
  },
  {
    product:    "Portronics GaN Charger 65W",
    price:      "₹999–₹1,999",
    category:   "Mobile Accessories",
    imageQuery: "gan charger compact usb c fast charging white",
    keywords:   ["portronics gan charger review india", "best 65w gan charger india 2026", "compact gan charger"]
  },
  {
    product:    "Boat Stone 352 Bluetooth Speaker",
    price:      "₹899–₹1,999",
    category:   "Tech & Audio",
    imageQuery: "portable bluetooth speaker outdoor waterproof bold",
    keywords:   ["boat stone 352 review india", "best bluetooth speaker under 2000 india", "boat portable speaker 2026"]
  },
  {
    product:    "Zebronics Zeb-Duke1 Gaming Headset",
    price:      "₹999–₹1,999",
    category:   "Tech & Gaming",
    imageQuery: "rgb gaming headset 7.1 surround mic pc",
    keywords:   ["zebronics zeb duke1 review india", "best gaming headset under 2000 india", "budget pc gaming headset"]
  },
  {
    product:    "Ant Esports MK3400W Keyboard",
    price:      "₹1,299–₹2,499",
    category:   "Tech & Gaming",
    imageQuery: "mechanical keyboard rgb backlit gaming compact tenkeyless",
    keywords:   ["ant esports mk3400w review india", "best mechanical keyboard under 2500 india", "budget gaming keyboard 2026"]
  },
  {
    product:    "Syska Smart LED Bulb",
    price:      "₹399–₹999",
    category:   "Smart Home Tech",
    imageQuery: "smart led bulb wifi rgb color changing ceiling",
    keywords:   ["syska smart bulb review india", "best smart led bulb india 2026", "wifi smart bulb under 1000"]
  },
  {
    product:    "Boat Airdopes 141 Earbuds",
    price:      "₹999–₹1,799",
    category:   "Tech & Audio",
    imageQuery: "boat airdopes tws earbuds lightweight compact white",
    keywords:   ["boat airdopes 141 review india", "best earbuds under 2000 india 2026", "boat bestseller earbuds"]
  },
  {
    product:    "Xiaomi Mi Smart Projector Mini",
    price:      "₹14,999–₹22,000",
    category:   "Home Entertainment",
    imageQuery: "portable mini projector home cinema compact android",
    keywords:   ["mi projector mini review india", "best portable projector under 20000 india 2026", "xiaomi projector india"]
  }
];

// ============================================
// TOPIC HELPERS — reads topics.json if present (Phase 4B)
// ============================================
function getActiveTopics() {
  try {
    if (fs.existsSync("./topics.json")) {
      const data = JSON.parse(fs.readFileSync("./topics.json", "utf-8"));
      if (Array.isArray(data.topics) && data.topics.length > 0) {
        console.log(`📅 Using monthly topics: ${data.generatedFor} (${data.topics.length} topics)`);
        return data.topics;
      }
    }
  } catch { /* fall through to hardcoded */ }
  return TOPICS;
}

function getTodaysTopic() {
  const pool = getActiveTopics();
  return pool[Math.floor(Date.now() / 86400000) % pool.length];
}

function getTomorrowsTopic() {
  const pool = getActiveTopics();
  return pool[(Math.floor(Date.now() / 86400000) + 1) % pool.length];
}

// Pick the review topic for today. A genuine product review needs a specific
// named product (Issue 7), so if today's rotation lands on a generic category
// (or a product already reviewed), advance to the next specific, not-yet-posted
// product in the pool. Uses only real products already present — never fabricates.
// Returns { topic, advanced }; topic is null when no eligible product remains.
function getTodaysReviewTopic() {
  const pool  = getActiveTopics();
  const start = Math.floor(Date.now() / 86400000) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const t = pool[(start + i) % pool.length];
    if (resolveProductIdentity(t).specific && !isAlreadyPosted(t.product, "review")) {
      return { topic: t, advanced: i > 0 };
    }
  }
  return { topic: null, advanced: false };
}

// Pick two SAME-CATEGORY specific products to compare, so we never pair unrelated
// items (e.g. a headset vs a mouse). Matches on productType (e.g. "Gaming
// Headsets") rather than the broad category ("Gaming"), which lumps headsets,
// keyboards and mice together. Starting from today's rotation, find the first
// specific product that has a same-productType, specific, not-yet-compared
// sibling. Returns { a, b }, or null when no sensible pair exists (→ skip + log).
function getComparisonPair() {
  const pool  = getActiveTopics();
  const start = Math.floor(Date.now() / 86400000) % pool.length;
  // Granular type key; falls back to category for legacy topics without productType.
  const typeOf = t => (t.productType || t.category || "").trim().toLowerCase();
  for (let i = 0; i < pool.length; i++) {
    const a = pool[(start + i) % pool.length];
    if (!resolveProductIdentity(a).specific) continue;
    const aType = typeOf(a);
    if (!aType) continue;
    for (let j = 1; j < pool.length; j++) {
      const b = pool[(start + i + j) % pool.length];
      if (b.product === a.product)             continue;
      if (typeOf(b) !== aType)                 continue;
      if (!resolveProductIdentity(b).specific) continue;
      // Order-independent dedup so we never post both "A vs B" and "B vs A".
      if (isAlreadyPosted(`${a.product} vs ${b.product}`, "comparison")) continue;
      if (isAlreadyPosted(`${b.product} vs ${a.product}`, "comparison")) continue;
      return { a, b };
    }
  }
  return null;
}

// ============================================
// SLUG BUILDERS
// ============================================
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildReviewSlug(product) {
  return `${slugify(product)}-review-india-${SEO_YEAR}`;
}

function buildBuyingGuideSlug(product) {
  return `best-${slugify(product)}-india-${SEO_YEAR}`;
}

function buildComparisonSlug(productA, productB) {
  return `${slugify(productA)}-vs-${slugify(productB)}-india-${SEO_YEAR}`;
}

function ensureTitleHasYear(title) {
  const t = (title || "").trim();
  return t && !t.includes(String(SEO_YEAR)) ? `${t} (${SEO_YEAR})` : t;
}

function readingTimeBadge(html) {
  const words   = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 238));
  return `<p style="color:#888;font-size:0.9em;margin-bottom:1.2em;">⏱️ ${minutes} min read</p>\n`;
}

// ============================================
// HISTORY — per-type duplicate prevention
// Structure: { reviews: [], buying_guides: [], comparisons: [] }
// ============================================
function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return { reviews: [], buying_guides: [], comparisons: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    // Migrate legacy flat-array format from v4
    if (Array.isArray(data)) {
      return { reviews: data, buying_guides: [], comparisons: [] };
    }
    return {
      reviews:       data.reviews       || [],
      buying_guides: data.buying_guides || [],
      comparisons:   data.comparisons   || []
    };
  } catch {
    return { reviews: [], buying_guides: [], comparisons: [] };
  }
}

function historyBucket(postType) {
  if (postType === "buying_guide") return "buying_guides";
  if (postType === "comparison")   return "comparisons";
  return "reviews";
}

function isAlreadyPosted(key, postType) {
  return readHistory()[historyBucket(postType)].includes(key);
}

function markPosted(key, postType) {
  const h = readHistory();
  const b = historyBucket(postType);
  h[b] = [...new Set([...h[b], key])];
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2));
  console.log(`📝 Marked posted: "${key}" [${postType}]`);
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================
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

async function slugExistsInWordPress(auth, slug) {
  try {
    console.log(`🔍 Checking slug: /${slug}/`);
    const res = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&per_page=1`,
      { headers: { Authorization: `Basic ${auth}` } },
      15000
    );
    if (!res.ok) return false;
    const posts = await res.json();
    if (Array.isArray(posts) && posts.length > 0) {
      console.log(`⚠️  Slug exists — Post ID: ${posts[0].id}`);
      return true;
    }
    console.log(`✅ Slug is unique`);
    return false;
  } catch (err) {
    console.log(`⚠️  Slug check failed: ${err.message}`);
    return false;
  }
}

async function retry(fn, retries = 3, label = "operation", delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const wait = delayMs * (2 ** i);
      console.log(`⚠️  ${label} failed (${i + 1}/${retries}) — retry in ${Math.round(wait / 1000)}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ============================================
// GEMINI API
// ============================================
async function callGemini(systemPrompt, userPrompt, maxTokens = 2500) {
  console.log(`📡 Calling Gemini (gemini-2.5-flash-lite)…`);

  for (let attempt = 1; attempt <= GEMINI_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            contents:         [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
          })
        },
        API_TIMEOUT_MS
      );

      const data = await res.json();
      if (res.status === 429) throw new Error("Gemini rate limit hit");

      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini ok — ${text.length} chars`);
        return text;
      }
      throw new Error(`Gemini error: ${JSON.stringify(data)}`);

    } catch (err) {
      if (attempt === GEMINI_RETRIES) {
        console.log(`❌ Gemini failed after ${GEMINI_RETRIES} retries`);
        throw err;
      }
      const wait = GEMINI_INITIAL_DELAY * (2 ** (attempt - 1));
      console.log(`⚠️  Gemini attempt ${attempt}/${GEMINI_RETRIES} — retry in ${Math.round(wait / 1000)}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// Post-generation sanitisation — strips Markdown code fences / backticks (Issue 1)
function cleanGeminiHtml(raw) {
  return (raw || "")
    .replace(/```html/gi, "")   // remove ```html opening fences
    .replace(/```/g, "")        // remove any remaining ``` fences
    .replace(/`/g, "")          // remove stray backticks
    .trim();
}

// ============================================
// CONTENT INTEGRITY RULES (shared system-prompt fragments)
// Each issue from the site audit maps to one rule below.
// ============================================
const RULE_RAW_HTML =
  `- Output raw HTML only. Do NOT use Markdown, code fences, triple backticks (\`\`\`), or any preamble or sign-off. Begin immediately with the first required HTML tag.`;

// Issue 3 — for single-product posts (review/comparison) where the product IS the input
const RULE_NO_INVENTED_PRODUCTS =
  `- Never invent, reference, or name any product, brand, or technology that is not present in the input data provided to you. If you are tempted to mention a complementary product as an example or comparison, omit it entirely. This rule has no exceptions.`;

// Issue 3 — variant for buying guides, which must recommend real products from a category
const RULE_NO_FICTIONAL_PRODUCTS =
  `- Only recommend genuine, real products that are actually sold on Amazon India. Never invent, fabricate, or name any fictional product, brand, or model. If you are not certain a product genuinely exists, omit it entirely. This rule has no exceptions.`;

// Issue 4 — affiliate tag must never be visible text
const RULE_AFFILIATE_TAG =
  `- Never mention the affiliate tag ${AFFILIATE_TAG} or any tracking parameter as visible text in the post content. It must appear only inside href attributes in hyperlinks.`;

// Issue 6 — no fabricated first-person testing claims
const RULE_NO_FIRST_PERSON =
  `- Do not write any first-person experiential claims such as "we tested", "we tried", "we wore", or "in our testing". All performance observations must be attributed to product specifications or customer feedback, phrased as "based on specifications" or "according to customer reviews".`;

// Issue 5 — exact, consistent price range everywhere
function rulePriceConsistency(price) {
  return `- Use the exact price range ${price} in every section of the post — introduction, specifications table, pros/cons, FAQ, and final verdict. Do not alter or approximate the price range anywhere.`;
}

// ============================================
// FAILURE LOGGING + PRE-PUBLISH VALIDATION
// ============================================
const FAILED_LOG = "./failed-posts.log";

// Logs a skipped/failed post with timestamp, topic, failed check and retry count
function logFailedPost(topicName, failedCheck, retriesAttempted = 0) {
  const line = `${new Date().toISOString()} | topic="${topicName}" | failed_check="${failedCheck}" | retries_attempted=${retriesAttempted}\n`;
  try {
    fs.appendFileSync(FAILED_LOG, line);
  } catch (e) {
    console.log(`⚠️  Could not write to ${FAILED_LOG}: ${e.message}`);
  }
  console.log(`📛 Logged failed post → ${FAILED_LOG} :: "${topicName}" — ${failedCheck} (retries: ${retriesAttempted})`);
}

// Issue 7 — decide whether a topic is a specific named product vs a generic category.
// A topic qualifies as "specific" if it carries an explicit identifier (ASIN, brand,
// Amazon listing URL) or its name contains a model number / recognised brand.
const KNOWN_PRODUCT_BRANDS = [
  "realme", "cmf", "boat", "noise", "redmi", "xiaomi", "ambrane", "fire-boltt",
  "fire boltt", "fireboltt", "portronics", "zebronics", "ant esports", "syska", "lego"
];

function resolveProductIdentity(topic) {
  const asin = topic.asin || topic.ASIN;
  if (asin && String(asin).trim()) return { specific: true, via: "asin" };

  const url = topic.amazonUrl || topic.amazon_url || topic.url || topic.listingUrl;
  if (url && /amazon\./i.test(String(url))) return { specific: true, via: "amazon listing url" };

  if (topic.brand && String(topic.brand).trim()) return { specific: true, via: "brand field" };

  const name = ` ${(topic.product || "").toLowerCase()} `;
  if (/\d/.test(name)) return { specific: true, via: "model number" };
  if (KNOWN_PRODUCT_BRANDS.some(b => name.includes(` ${b} `))) return { specific: true, via: "brand in name" };

  return { specific: false, via: null };
}

// Extracts all INR price ranges (e.g. "₹500–₹3,000") normalised to "500-3000"
function extractPriceRanges(text) {
  const re = /₹\s*[\d,]+\s*[–—-]\s*₹?\s*[\d,]+/g;
  return (text.match(re) || []).map(m =>
    m.replace(/[₹,\s]/g, "").split(/[–—-]/).filter(Boolean).join("-")
  );
}

// Pre-publish validation — returns { ok, failedCheck }.
// Covers Issue 2 (placeholders), Issue 4 (visible affiliate tag) and
// Issue 5 (internal price-range inconsistency, single-product reviews only).
function validateGeneratedPost(html, { price = null, postType = "review" } = {}) {
  // Issue 2 — unfilled square-bracket placeholders like [Brand Name]
  const placeholder = html.match(/\[[A-Za-z]+(?:\s+[A-Za-z]+)*\]/);
  if (placeholder) {
    return { ok: false, failedCheck: `Unfilled placeholder text "${placeholder[0]}"` };
  }

  // Issue 4 — affiliate tag visible in rendered text (HTML tags/attributes stripped out)
  const visibleText = html.replace(/<[^>]+>/g, " ");
  if (visibleText.includes(AFFILIATE_TAG)) {
    return { ok: false, failedCheck: `Affiliate tag "${AFFILIATE_TAG}" visible in content` };
  }

  // Issue 5 — a single-product review must state one consistent price range everywhere
  if (postType === "review") {
    const distinct = [...new Set(extractPriceRanges(html))];
    if (distinct.length > 1) {
      return { ok: false, failedCheck: `Inconsistent price ranges (${distinct.join(" vs ")})` };
    }
  }

  return { ok: true, failedCheck: null };
}

// ============================================
// PEXELS / IMAGE
// ============================================
async function fetchImageFromPexels(q) {
  if (!PEXELS_API_KEY) return null;
  console.log(`🖼️  Pexels: "${q}"…`);
  try {
    const res = await fetchWithTimeout(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5`,
      { headers: { Authorization: PEXELS_API_KEY } },
      FETCH_TIMEOUT_MS
    );
    if (res.status === 401) { console.log("⚠️  Pexels 401"); return null; }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.photos?.length > 0) {
      const best = data.photos.sort((a, b) => b.width - a.width)[0];
      const url  = best.src.large2x || best.src.large || best.src.medium;
      if (url) { console.log(`✅ Pexels image found`); return url; }
    }
  } catch (err) { console.log(`⚠️  Pexels: ${err.message}`); }
  return null;
}

async function fetchImage(imageQuery) {
  if (!imageQuery) imageQuery = "tech product review";
  if (PEXELS_API_KEY) {
    for (const q of [imageQuery, `${imageQuery} product`, `${imageQuery} review`, "lifestyle product"]) {
      const url = await fetchImageFromPexels(q);
      if (url) return url;
    }
  }
  console.log(`🖼️  Unsplash fallback`);
  return `https://source.unsplash.com/featured/1200x600/?${encodeURIComponent(imageQuery)}`;
}

async function uploadImageToWP(auth, imageUrl, altText) {
  try {
    console.log(`📤 Uploading image…`);
    const imgRes = await fetchWithTimeout(imageUrl, {}, FETCH_TIMEOUT_MS);
    if (!imgRes.ok) throw new Error("Image download failed");
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const up  = await retry(() =>
      fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
        method:  "POST",
        headers: {
          Authorization:         `Basic ${auth}`,
          "Content-Disposition": `attachment; filename="featured-image.jpg"`,
          "Content-Type":        "image/jpeg"
        },
        body: buf
      }, 20000)
    , 2, "WP media upload", 2000);
    if (!up.ok) throw new Error("Media upload failed");
    const media = await up.json();
    if (media.id) {
      console.log(`✅ Image uploaded — ID: ${media.id}`);
      return { id: media.id, url: media.source_url };
    }
  } catch (e) { console.log(`⚠️  Image upload skipped: ${e.message}`); }
  return null;
}

// ============================================
// CONTENT GENERATORS
// ============================================

// ── 1. Review Post ────────────────────────
async function generateReviewPost(topic, imageUrl, trendingContext = "") {
  console.log(`\n📝 Generating Review: ${topic.product}…`);

  const trendingNote = trendingContext
    ? `\nTRENDING CONTEXT (weave naturally into the review where relevant):\n${trendingContext}\n`
    : "";

  const sys = `You are an expert SEO content writer for Teja Reviews (tejareviews.in).
Write a high-converting product review for Indian buyers in ${SEO_YEAR}.
RULES:
- Indian English; reference Indian context (weather, homes, offices, Indian budgets).
- Tone: Professional yet conversational.
- Format: Strictly HTML (h2, h3, p, ul, li, table). No markdown, no backticks, no code fences.
- Length: 900–1200 words.
- Structure:
  1. Quick Verdict (rating out of 5)
  2. Key Specifications (HTML table)
  3. Design & Build Quality
  4. Performance & Daily Usage
  5. Pros and Cons (two separate <ul> lists)
  6. Who Should Buy? (Perfect For / Skip If)
  7. Final Verdict (mention Amazon India availability)
- Start directly from <h2>Quick Verdict</h2>. No preamble.
STRICT CONTENT INTEGRITY RULES (no exceptions):
${RULE_RAW_HTML}
${RULE_NO_INVENTED_PRODUCTS}
${RULE_AFFILIATE_TAG}
${rulePriceConsistency(topic.price)}
${RULE_NO_FIRST_PERSON}${trendingNote}`;

  const usr = `Product: ${topic.product}
Primary Keyword: ${topic.keywords[0]}
Secondary Keyword: ${topic.keywords[1] || ""}
Price Range: ${topic.price}
Year: ${SEO_YEAR}
Amazon Affiliate Tag: ${AFFILIATE_TAG}`;

  const html = cleanGeminiHtml(await callGemini(sys, usr, 2500));

  const imageBlock = imageUrl ? `
<figure style="margin:2rem 0;text-align:center;">
  <img src="${imageUrl}" alt="${topic.product} Review India ${SEO_YEAR}" style="width:100%;max-width:800px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.1);" loading="lazy"/>
  <figcaption style="font-size:13px;color:#666;margin-top:8px;">${topic.product} — Available in India for ${topic.price}</figcaption>
</figure>` : "";

  const shopButtons = `
<div style="display:flex;gap:12px;flex-wrap:wrap;margin:2rem 0;justify-content:center;">
  <a href="https://www.amazon.in/s?k=${encodeURIComponent(topic.product)}&tag=${AFFILIATE_TAG}" target="_blank" rel="noopener noreferrer" style="background:#FF9900;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛒 View on Amazon India</a>
  <a href="https://www.flipkart.com/search?q=${encodeURIComponent(topic.product)}" target="_blank" rel="noopener noreferrer" style="background:#2874F0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛍️ Check Flipkart Price</a>
</div>`;

  let body = html
    .replace("</h2>", `</h2>${imageBlock}`)
    .replace("</h2>", `</h2>${shopButtons}`);

  body += `
<hr style="margin:3rem 0;">
<div style="background:#f9f9f9;padding:20px;border-radius:10px;">
  <h3 style="margin-top:0;">Related Buying Guides</h3>
  <ul>
    <li><a href="/category/${slugify(topic.category)}/">Best ${topic.category} Products in India</a></li>
    <li><a href="/">Latest Reviews on Teja Reviews</a></li>
  </ul>
</div>
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"Product",
  "name":"${topic.product}",
  "description":"Expert review of ${topic.product} for Indian consumers in ${SEO_YEAR}.",
  "brand":{"@type":"Brand","name":"Teja Reviews"},
  "offers":{"@type":"Offer","priceCurrency":"INR","price":"${topic.price.split("–")[0].replace(/[^0-9]/g,"")}","availability":"https://schema.org/InStock"}
}
</script>`;

  console.log(`✅ Review generated — ${body.length} chars`);
  return body;
}

// ── 2. Buying Guide Post ──────────────────
async function generateBuyingGuidePost(topic, imageUrl, trendingContext = "") {
  // Buying guides are category-level. Use productType (e.g. "Security Cameras")
  // when available so a specific-product topic still yields "Best Security Cameras",
  // not "Best <one exact model>". Falls back to product for legacy/hardcoded topics.
  const subject = topic.productType || topic.product;
  console.log(`\n📝 Generating Buying Guide: Best ${subject}…`);

  const trendingNote = trendingContext
    ? `\nTRENDING CONTEXT (use to recommend currently popular picks):\n${trendingContext}\n`
    : "";

  const sys = `You are an expert affiliate content writer for Teja Reviews (tejareviews.in).
Write a comprehensive buying guide for Indian buyers in ${SEO_YEAR}.
RULES:
- Indian English; mention Indian climate, lifestyle, budget-consciousness, INR pricing.
- Tone: Helpful, authoritative, trust-building.
- Format: Strictly HTML (h2, h3, p, ul, li, table). No markdown, no backticks, no code fences.
- Length: 1100–1400 words.${trendingNote}
- Structure:
  1. <h2>Why Trust This Guide?</h2> — brief intro on how picks were selected
  2. <h2>Top 5 Best ${subject} in India ${SEO_YEAR}</h2> — each pick as <h3> with:
       · 2–3 sentence description
       · Key specs as <ul>
       · "Best for:" one-liner
       · Amazon India CTA button using affiliate tag ${AFFILIATE_TAG}
  3. <h2>Comparison Table</h2> — HTML <table>: Name | Price (INR) | Key Feature | Best For | Rating
  4. <h2>How to Choose the Right ${subject}</h2> — 4–5 key buying factors
  5. <h2>Who Should Buy What?</h2> — 3–4 Indian buyer personas
  6. <h2>Final Verdict</h2> — top pick recommendation with Amazon India link
- Start from <h2>Why Trust This Guide?</h2>. No preamble.
STRICT CONTENT INTEGRITY RULES (no exceptions):
${RULE_RAW_HTML}
${RULE_NO_FICTIONAL_PRODUCTS}
${RULE_AFFILIATE_TAG}
- Keep all INR prices within the overall range ${topic.price}; do not invent prices outside it or contradict it.
${RULE_NO_FIRST_PERSON}`;

  const usr = `Product Category: ${subject}
Price Range: ${topic.price}
Focus Keyword: best ${subject.toLowerCase()} India
Year: ${SEO_YEAR}
Amazon Affiliate Tag: ${AFFILIATE_TAG}`;

  const html = cleanGeminiHtml(await callGemini(sys, usr, 3000));

  const imageBlock = imageUrl ? `
<figure style="margin:2rem 0;text-align:center;">
  <img src="${imageUrl}" alt="Best ${subject} India ${SEO_YEAR}" style="width:100%;max-width:800px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.1);" loading="lazy"/>
  <figcaption style="font-size:13px;color:#666;margin-top:8px;">Best ${subject} in India — Price Range: ${topic.price}</figcaption>
</figure>` : "";

  const shopButton = `
<div style="text-align:center;margin:2rem 0;">
  <a href="https://www.amazon.in/s?k=${encodeURIComponent("best " + subject)}&tag=${AFFILIATE_TAG}" target="_blank" rel="noopener noreferrer" style="background:#FF9900;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">🛒 Shop All Picks on Amazon India</a>
</div>`;

  let body = html
    .replace("</h2>", `</h2>${imageBlock}`)
    .replace("</h2>", `</h2>${shopButton}`);

  body += `
<hr style="margin:3rem 0;">
<div style="background:#f9f9f9;padding:20px;border-radius:10px;">
  <h3 style="margin-top:0;">Related Reviews</h3>
  <ul>
    <li><a href="/category/${slugify(topic.category)}/">All ${topic.category} Reviews</a></li>
    <li><a href="/">Latest Reviews on Teja Reviews</a></li>
  </ul>
</div>`;

  console.log(`✅ Buying guide generated — ${body.length} chars`);
  return body;
}

// ── 3. Comparison Post ────────────────────
async function generateComparisonPost(topicA, topicB, imageUrl, trendingContext = "") {
  console.log(`\n📝 Generating Comparison: ${topicA.product} vs ${topicB.product}…`);

  const trendingNote = trendingContext
    ? `\nTRENDING CONTEXT (reference current market context in verdict):\n${trendingContext}\n`
    : "";

  const sys = `You are an expert product comparison writer for Teja Reviews (tejareviews.in).
Write a detailed vs. article for Indian buyers in ${SEO_YEAR}.
RULES:
- Indian English; consider Indian pricing, climate, usage patterns.
- Tone: Fair, balanced, with a decisive final verdict.
- Format: Strictly HTML (h2, h3, p, ul, li, table). No markdown, no backticks, no code fences.
- Length: 1000–1300 words.${trendingNote}
- Structure:
  1. <h2>Quick Verdict</h2> — which wins and for whom (2–3 sentences)
  2. <h2>At a Glance: Side-by-Side</h2> — HTML <table> (Feature | ${topicA.product} | ${topicB.product})
     Rows: Price Range · Best For · Key Feature · Amazon Availability · Our Rating
  3. <h2>${topicA.product}: Strengths & Weaknesses</h2> — 150 words + pros/cons <ul>
  4. <h2>${topicB.product}: Strengths & Weaknesses</h2> — 150 words + pros/cons <ul>
  5. <h2>Head-to-Head: Category Winners</h2> — 5 categories with a winner declared:
     Value for Money · Performance · Durability · Ease of Use · India Availability
  6. <h2>Who Should Choose ${topicA.product}?</h2> — 3 bullet points
  7. <h2>Who Should Choose ${topicB.product}?</h2> — 3 bullet points
  8. <h2>Final Verdict</h2> — clear recommendation; Amazon India links for both (tag: ${AFFILIATE_TAG})
- Start from <h2>Quick Verdict</h2>. No preamble.
STRICT CONTENT INTEGRITY RULES (no exceptions):
${RULE_RAW_HTML}
${RULE_NO_INVENTED_PRODUCTS}
${RULE_AFFILIATE_TAG}
- Use the exact price range ${topicA.price} for ${topicA.product} and ${topicB.price} for ${topicB.product} in every section. Do not alter or approximate either price range anywhere.
${RULE_NO_FIRST_PERSON}`;

  const usr = `Product A: ${topicA.product} (${topicA.price})
Product B: ${topicB.product} (${topicB.price})
Focus Keyword: ${topicA.product.toLowerCase()} vs ${topicB.product.toLowerCase()} India
Year: ${SEO_YEAR}
Amazon Affiliate Tag: ${AFFILIATE_TAG}`;

  const html = cleanGeminiHtml(await callGemini(sys, usr, 3000));

  const imageBlock = imageUrl ? `
<figure style="margin:2rem 0;text-align:center;">
  <img src="${imageUrl}" alt="${topicA.product} vs ${topicB.product} India ${SEO_YEAR}" style="width:100%;max-width:800px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.1);" loading="lazy"/>
  <figcaption style="font-size:13px;color:#666;margin-top:8px;">${topicA.product} vs ${topicB.product} — Which is the better buy in India?</figcaption>
</figure>` : "";

  const shopButtons = `
<div style="display:flex;gap:12px;flex-wrap:wrap;margin:2rem 0;justify-content:center;">
  <a href="https://www.amazon.in/s?k=${encodeURIComponent(topicA.product)}&tag=${AFFILIATE_TAG}" target="_blank" rel="noopener noreferrer" style="background:#FF9900;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛒 Buy ${topicA.product} on Amazon</a>
  <a href="https://www.amazon.in/s?k=${encodeURIComponent(topicB.product)}&tag=${AFFILIATE_TAG}" target="_blank" rel="noopener noreferrer" style="background:#FF9900;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛒 Buy ${topicB.product} on Amazon</a>
</div>`;

  let body = html
    .replace("</h2>", `</h2>${imageBlock}`)
    .replace("</h2>", `</h2>${shopButtons}`);

  body += `
<hr style="margin:3rem 0;">
<div style="background:#f9f9f9;padding:20px;border-radius:10px;">
  <h3 style="margin-top:0;">More Comparisons</h3>
  <ul>
    <li><a href="/category/${slugify(topicA.category)}/">All ${topicA.category} Reviews</a></li>
    <li><a href="/">Latest on Teja Reviews</a></li>
  </ul>
</div>`;

  console.log(`✅ Comparison generated — ${body.length} chars`);
  return body;
}

// ============================================
// META GENERATORS
// ============================================
function generateReviewMeta(topic) {
  return {
    title:           `${topic.product} Review India ${SEO_YEAR}: Worth Buying?`,
    slug:            buildReviewSlug(topic.product),
    metaDescription: `${topic.product} review India ${SEO_YEAR}. Check price, features, pros & cons and whether it is worth buying in India.`,
    focusKeyword:    topic.keywords[0],
    tags:            [topic.keywords[0], topic.keywords[1] || topic.product],
    category:        topic.category
  };
}

function generateBuyingGuideMeta(topic) {
  const subject = topic.productType || topic.product;
  return {
    title:           `Best ${subject} in India ${SEO_YEAR}: Top 5 Picks & Buying Guide`,
    slug:            buildBuyingGuideSlug(subject),
    metaDescription: `Best ${subject.toLowerCase()} in India ${SEO_YEAR}? Our expert guide covers top 5 picks, INR prices, pros & cons to help you choose right.`,
    focusKeyword:    `best ${subject.toLowerCase()} India`,
    tags:            [`best ${subject.toLowerCase()} India`, topic.keywords[0], topic.category.toLowerCase()],
    category:        topic.category
  };
}

function generateComparisonMeta(topicA, topicB) {
  return {
    title:           `${topicA.product} vs ${topicB.product} India ${SEO_YEAR}: Which One to Buy?`,
    slug:            buildComparisonSlug(topicA.product, topicB.product),
    metaDescription: `${topicA.product} vs ${topicB.product} India ${SEO_YEAR}: specs, price & pros/cons compared. Find out which is the better buy for Indian consumers.`,
    focusKeyword:    `${topicA.product.toLowerCase()} vs ${topicB.product.toLowerCase()} India`,
    tags:            [`${topicA.product.toLowerCase()} vs ${topicB.product.toLowerCase()}`, topicA.keywords[0], topicB.keywords[0]],
    category:        topicA.category
  };
}

// ============================================
// PHASE 2 — FAQ BLOCK (separate Gemini call)
// ============================================
async function generateFAQBlock(productContext, postType, priceRange = "") {
  console.log(`\n❓ Generating FAQ block: ${productContext}…`);
  try {
    await new Promise(r => setTimeout(r, GEMINI_CALL_DELAY));

    const context =
      postType === "buying_guide" ? `buying guide for ${productContext}` :
      postType === "comparison"   ? `comparison of ${productContext}`    :
                                    `review of ${productContext}`;

    const priceNote = priceRange
      ? `\n${rulePriceConsistency(priceRange)}`
      : "";

    const sys = `You are an SEO expert writing FAQ sections for an Indian affiliate review blog.
Generate exactly 5 FAQ questions and answers for a ${context}.
RULES:
- Questions must target "People Also Ask" style queries Indian buyers search on Google.
- Answers: 2–3 sentences, helpful, factual, India-relevant.
- Output ONLY a single <div class="faq-block"> containing exactly 5 <div class="faq-item"> elements.
- Each faq-item: <h3 class="faq-question">QUESTION</h3><p class="faq-answer">ANSWER</p>
- No markdown, no code fences, no preamble, no text outside the wrapper div.
STRICT CONTENT INTEGRITY RULES (no exceptions):
${RULE_RAW_HTML}
${RULE_NO_INVENTED_PRODUCTS}
${RULE_AFFILIATE_TAG}
${RULE_NO_FIRST_PERSON}${priceNote}`;

    const usr = `Topic: ${productContext} (India, ${SEO_YEAR})`;

    const raw   = cleanGeminiHtml(await callGemini(sys, usr, 1000));
    const qList = [...raw.matchAll(/<h3[^>]*>(.*?)<\/h3>/gs)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    const aList = [...raw.matchAll(/<p[^>]*class="faq-answer"[^>]*>(.*?)<\/p>/gs)].map(m => m[1].replace(/<[^>]+>/g, "").trim());

    const pairs = [];
    for (let i = 0; i < Math.min(qList.length, aList.length); i++) {
      if (qList[i] && aList[i]) pairs.push({ q: qList[i], a: aList[i] });
    }

    const schema = pairs.length > 0 ? `
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[${pairs.map(p => `
    {"@type":"Question","name":${JSON.stringify(p.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(p.a)}}}`).join(",")}
  ]
}
</script>` : "";

    console.log(`✅ FAQ block generated (${pairs.length} items)`);
    return `
<div style="background:#f5f9ff;border:1px solid #d0e4ff;border-radius:12px;padding:24px;margin:2rem 0;">
  <h2 style="margin-top:0;color:#1a1a2e;">❓ Frequently Asked Questions</h2>
  ${raw}
</div>
${schema}`;

  } catch (err) {
    console.log(`⚠️  FAQ generation failed: ${err.message} — continuing without FAQ`);
    return "";
  }
}

// ============================================
// PHASE 2 — INTERNAL LINKS (Gemini call post-publish)
// ============================================
async function generateInternalLinks(auth, currentPostTitle) {
  console.log(`\n🔗 Generating internal links…`);
  try {
    const res = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=10&orderby=date&order=desc&status=publish`,
      { headers: { Authorization: `Basic ${auth}` } },
      15000
    );
    if (!res.ok) return "";

    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) return "";

    // Filter out the just-published post
    const candidates = posts
      .filter(p => !p.title.rendered.toLowerCase().includes(currentPostTitle.toLowerCase().slice(0, 20)))
      .slice(0, 10);

    if (candidates.length === 0) return "";

    const postList = candidates.map(p => `- "${p.title.rendered}": ${p.link}`).join("\n");

    await new Promise(r => setTimeout(r, GEMINI_CALL_DELAY));

    const sys = `You are an SEO content strategist for an Indian affiliate review blog.
Select the 3 most topically relevant posts to internally link from a post titled "${currentPostTitle}".
Output ONLY a valid HTML <ul> with exactly 3 <li><a href="EXACT_URL">Descriptive anchor text</a></li> items.
Use keyword-rich anchor text — NOT the full post title verbatim. No preamble, no markdown, nothing outside the <ul>.`;

    const usr = `Current post: "${currentPostTitle}"\n\nAvailable posts:\n${postList}`;

    const raw = cleanGeminiHtml(await callGemini(sys, usr, 400));
    console.log(`✅ Internal links generated`);

    return `
<div style="background:#fff8f0;border:1px solid #ffe0b2;border-radius:12px;padding:24px;margin:2rem 0;">
  <h3 style="margin-top:0;color:#e65100;">📚 You Might Also Like</h3>
  ${raw}
</div>`;

  } catch (err) {
    console.log(`⚠️  Internal links failed: ${err.message}`);
    return "";
  }
}

// ============================================
// PHASE 4 — QUORA ANSWER GENERATOR
// Generates 3 copy-paste Quora answers, saves as private WP draft
// ============================================
async function generateAndSaveQuoraAnswers(auth, productContext, postType, postUrl, postTitle) {
  console.log(`\n💬 Generating Quora answers for: ${productContext}…`);
  try {
    await new Promise(r => setTimeout(r, GEMINI_CALL_DELAY));

    const typeLabel =
      postType === "buying_guide" ? `buying guide for ${productContext}` :
      postType === "comparison"   ? `comparison of ${productContext}`    :
                                    `review of ${productContext}`;

    const sys = `You are a helpful Indian consumer writing genuine Quora answers about products.
Write exactly 3 separate Quora answers targeting different question types.
Each answer:
- 180–250 words, conversational Indian English, first-person ("I tested/bought/used this")
- Genuinely helpful — mention real pros, cons, price context in India
- End with: "I wrote a detailed breakdown here: [REVIEW_LINK]" (use the exact URL provided)
- NO markdown headers, NO bullet points — flowing paragraphs only
- Feel like a real person wrote it, not an AI

Separate each answer with: ---ANSWER_BREAK---`;

    const usr = `Product/Topic: ${productContext}
Post type: ${typeLabel}
Review URL: ${postUrl}
Year: ${SEO_YEAR}

Question 1 angle: "Which [product] should I buy under ₹X in India?" (budget/value focus)
Question 2 angle: "Is [product] worth buying in India ${SEO_YEAR}?" (worth-it verdict focus)
Question 3 angle: "What are the pros and cons of [product] for Indian users?" (detailed analysis)`;

    const raw = await callGemini(sys, usr, 1200);
    const answers = raw.split(/---ANSWER_BREAK---/i).map(a => a.trim()).filter(a => a.length > 50);

    if (answers.length === 0) throw new Error("No answers parsed");

    // Build private WP draft HTML
    const today    = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const sections = answers.map((ans, i) => {
      const questionLabels = [
        `"Which ${productContext} should I buy under ₹X in India?"`,
        `"Is ${productContext} worth buying in India ${SEO_YEAR}?"`,
        `"What are the pros and cons of ${productContext} for Indian users?"`
      ];
      return `
<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:20px;margin-bottom:20px;">
  <p style="margin:0 0 8px;font-size:12px;color:#888;font-weight:600;">ANSWER ${i + 1} — Post under question: ${questionLabels[i] || "related question"}</p>
  <div style="font-size:15px;line-height:1.7;color:#1a1a1a;">${ans.replace(/\n\n/g, "</p><p>").replace(/\n/g, " ")}</div>
  <p style="margin:12px 0 0;"><a href="${postUrl}" style="color:#0073aa;">${postUrl}</a></p>
</div>`;
    }).join("");

    const draftHtml = `
<div style="font-family:sans-serif;max-width:800px;">
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;">
    <strong>📋 How to use:</strong> Copy each answer below → go to Quora India → search the question → paste answer → add your own photo if possible.
    <br><strong>Review URL:</strong> <a href="${postUrl}">${postUrl}</a>
    <br><strong>Generated:</strong> ${today}
  </div>
  ${sections}
</div>`;

    const res = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts`,
      {
        method:  "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:   `📋 Quora Answers: ${postTitle}`,
          content: draftHtml,
          status:  "private",
          slug:    `quora-${slugify(productContext)}-${Date.now().toString().slice(-4)}`
        })
      },
      20000
    );

    if (res.ok) {
      const draft = await res.json();
      console.log(`✅ Quora answers saved → WP Admin: ${WORDPRESS_URL}/wp-admin/post.php?post=${draft.id}&action=edit`);
    } else {
      console.log(`⚠️  Quora draft save failed: ${res.status}`);
    }
  } catch (err) {
    console.log(`⚠️  Quora generation failed: ${err.message} — continuing`);
  }
}

// ============================================
// PHASE 2 — INDEXNOW PING
// ============================================
async function pingIndexNow(url) {
  if (!INDEXNOW_KEY) {
    console.log("⚠️  INDEXNOW_KEY not set — skipping IndexNow ping");
    return;
  }
  try {
    console.log(`📡 Pinging IndexNow: ${url}`);
    const res = await fetchWithTimeout(
      "https://api.indexnow.org/indexnow",
      {
        method:  "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body:    JSON.stringify({
          host:        "tejareviews.in",
          key:         INDEXNOW_KEY,
          keyLocation: `https://tejareviews.in/${INDEXNOW_KEY}.txt`,
          urlList:     [url]
        })
      },
      10000
    );
    console.log(res.ok || res.status === 202
      ? `✅ IndexNow ping ok (${res.status})`
      : `⚠️  IndexNow status: ${res.status}`);
  } catch (err) {
    console.log(`⚠️  IndexNow failed: ${err.message}`);
  }
}

// ============================================
// WORDPRESS HELPERS
// ============================================
async function getCategoryId(auth, name) {
  try {
    const res  = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`,
      { headers: { Authorization: `Basic ${auth}` } },
      15000
    );
    const cats = await res.json();
    console.log(`🔍 Category search:`, JSON.stringify(cats).slice(0, 200));
    if (Array.isArray(cats) && cats.length > 0) return parseInt(cats[0].id, 10);

    const cr     = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/categories`,
      {
        method:  "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ name, slug: slugify(name) })
      },
      15000
    );
    const newCat = await cr.json();
    console.log(`🔍 New category:`, JSON.stringify(newCat).slice(0, 200));
    if (newCat.code === "term_exists") return parseInt(newCat.data.term_id, 10);
    return parseInt(newCat.id, 10);
  } catch (err) {
    console.log(`⚠️  getCategoryId failed: ${err.message}`);
    return 1; // fallback: Uncategorized
  }
}

async function getTagIds(auth, tags) {
  const ids = await Promise.all(tags.slice(0, 3).map(async (tag) => {
    try {
      const r = await fetchWithTimeout(
        `${WORDPRESS_URL}/wp-json/wp/v2/tags`,
        {
          method:  "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ name: tag })
        },
        15000
      );
      const t = await r.json();
      if (t.id)                     return parseInt(t.id, 10);
      if (t.code === "term_exists") return parseInt(t.data.term_id, 10);
    } catch { return null; }
  }));
  return ids.filter(Boolean);
}

async function publishToWordPress(content, meta, featuredImageId, auth) {
  console.log(`\n🚀 Publishing to tejareviews.in…`);

  let slug = meta.slug;
  if (await slugExistsInWordPress(auth, slug)) {
    console.log(`⚠️  Duplicate slug — appending suffix`);
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const categoryId = await getCategoryId(auth, meta.category);
  console.log(`🔍 Category ID: ${categoryId} (${typeof categoryId})`);
  const tagIds    = await getTagIds(auth, meta.tags);
  const postTitle = ensureTitleHasYear(meta.title);

  const payload = {
    title:      postTitle,
    content,
    slug,
    status:     "publish",
    categories: [categoryId],
    tags:       tagIds,
    meta: {
      rank_math_title:         postTitle,
      rank_math_description:   meta.metaDescription,
      rank_math_focus_keyword: meta.focusKeyword,
      rank_math_robots:        ["index", "follow"]
    }
  };
  if (featuredImageId) payload.featured_media = featuredImageId;

  const res  = await retry(() =>
    fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
      method:  "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    }, 20000)
  , 2, "WP post publish", 3000);

  const post = await res.json();
  if (!res.ok) throw new Error(`WordPress publish error: ${JSON.stringify(post)}`);

  console.log(`\n🎉 PUBLISHED!`);
  console.log(`📌 ${post.title.rendered}`);
  console.log(`🔗 ${WORDPRESS_URL}/${post.slug}/`);
  return post;
}

async function updatePostContent(auth, postId, newContent) {
  try {
    console.log(`📝 Appending internal links to post ${postId}…`);
    const res = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts/${postId}`,
      {
        method:  "PUT",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ content: newContent })
      },
      20000
    );
    if (res.ok) {
      console.log(`✅ Post updated with internal links`);
    } else {
      console.log(`⚠️  Post update failed: ${res.status}`);
    }
  } catch (err) {
    console.log(`⚠️  Post update error: ${err.message}`);
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log("🚀 Teja Reviews — Gemini Auto Poster v5");
  console.log(`📋 POST_TYPE : ${POST_TYPE.toUpperCase()}`);
  console.log("==========================================");

  if (!GEMINI_KEY)  throw new Error("Missing GEMINI_API_KEY");
  if (!WP_APP_PASS) throw new Error("Missing WP_APP_PASSWORD");

  const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");

  let content, meta, imageUrl, uploadedImg, postKey, productContext;

  try {

    // ── PHASE 4C: fetch trending context once for all generators ──
    const trendingCtx = await getTrendingContext();

    // Per-type setup populates these; generateBody() produces the HTML body.
    let generateBody;            // () => Promise<string>
    let imgUploadPromise;        // Promise<uploadedImg> (runs concurrently with generation)
    let reviewPrice    = null;   // price range for Issue 5 identity check (reviews only)
    let faqPrice       = "";     // price range passed into the FAQ generator (Issue 5)

    // ── REVIEW ──────────────────────────────────────────────────
    if (POST_TYPE === "review") {
      // ── ISSUE 7: a review needs a specific named product, not a generic category ──
      const { topic, advanced } = getTodaysReviewTopic();
      if (!topic) {
        const attempted = getTodaysTopic().product;
        console.log(`⚠️  No specific, unposted product available for review. Skipping.`);
        logFailedPost(attempted, "No specific product provided", 0);
        return;
      }
      console.log(`📦 Topic: ${topic.product}${advanced ? " (advanced past generic/already-posted topics)" : ""}`);
      postKey        = topic.product;
      productContext = topic.product;

      imageUrl         = await fetchImage(topic.imageQuery);
      imgUploadPromise = uploadImageToWP(auth, imageUrl, topic.product);
      meta             = generateReviewMeta(topic);
      reviewPrice      = topic.price;
      faqPrice         = topic.price;
      generateBody     = () => generateReviewPost(topic, imageUrl, trendingCtx);

    // ── BUYING GUIDE ─────────────────────────────────────────────
    } else if (POST_TYPE === "buying_guide") {
      const topic = getTodaysTopic();
      // Category-level guide: prefer productType ("Security Cameras") over the exact
      // model, so dedup and titles are per-category, not per-product.
      const guideSubject = topic.productType || topic.product;
      console.log(`📦 Topic: Best ${guideSubject}`);
      postKey        = guideSubject;
      productContext = `best ${guideSubject}`;

      if (isAlreadyPosted(postKey, "buying_guide")) {
        console.log("⚠️  Buying guide already posted today. Skipping.");
        return;
      }

      imageUrl         = await fetchImage(topic.imageQuery);
      imgUploadPromise = uploadImageToWP(auth, imageUrl, `Best ${guideSubject}`);
      meta             = generateBuyingGuideMeta(topic);
      faqPrice         = topic.price;
      generateBody     = () => generateBuyingGuidePost(topic, imageUrl, trendingCtx);

    // ── COMPARISON ───────────────────────────────────────────────
    } else if (POST_TYPE === "comparison") {
      // Compare two SAME-PRODUCT-TYPE specific products (never headset vs mouse).
      const pair = getComparisonPair();
      if (!pair) {
        const attempted = getTodaysTopic().product;
        console.log("⚠️  No same-type product pair available to compare. Skipping.");
        logFailedPost(attempted, "No same-type product to compare", 0);
        return;
      }
      const topicA = pair.a;
      const topicB = pair.b;
      console.log(`📦 Comparing: ${topicA.product} vs ${topicB.product} [${topicA.category}]`);
      postKey        = `${topicA.product} vs ${topicB.product}`;
      productContext = postKey;
      // getComparisonPair() already excludes already-posted combinations.

      imageUrl         = await fetchImage(topicA.imageQuery);
      imgUploadPromise = uploadImageToWP(auth, imageUrl, postKey);
      meta             = generateComparisonMeta(topicA, topicB);
      generateBody     = () => generateComparisonPost(topicA, topicB, imageUrl, trendingCtx);

    } else {
      throw new Error(`Unknown POST_TYPE: "${POST_TYPE}". Use: review | buying_guide | comparison`);
    }

    // ── GENERATE + PRE-PUBLISH VALIDATION (retry up to 2 times) ──
    // Body + FAQ are regenerated together so the price-consistency check (Issue 5)
    // covers the FAQ as well. On repeated failure the post is logged and skipped.
    const MAX_GEN_ATTEMPTS = 3; // 1 initial attempt + up to 2 retries
    let attemptsRun     = 0;
    let lastFailedCheck = null;

    for (let attempt = 1; attempt <= MAX_GEN_ATTEMPTS; attempt++) {
      attemptsRun = attempt;
      const body     = await generateBody();
      const faqBlock = await generateFAQBlock(productContext, POST_TYPE, faqPrice);
      const candidate = body + faqBlock;

      const check = validateGeneratedPost(candidate, { price: reviewPrice, postType: POST_TYPE });
      if (check.ok) {
        content = candidate;
        break;
      }

      lastFailedCheck = check.failedCheck;
      console.log(`⚠️  Pre-publish validation failed (${check.failedCheck}) — attempt ${attempt}/${MAX_GEN_ATTEMPTS}`);
      if (attempt < MAX_GEN_ATTEMPTS) await new Promise(r => setTimeout(r, GEMINI_CALL_DELAY));
    }

    if (!content) {
      logFailedPost(postKey, lastFailedCheck || "Validation failed", attemptsRun - 1);
      console.log(`⛔ Skipping "${postKey}" after ${attemptsRun - 1} retr${attemptsRun - 1 === 1 ? "y" : "ies"} — failed check: ${lastFailedCheck}`);
      return;
    }

    uploadedImg = await imgUploadPromise;

    // ── READING TIME BADGE ───────────────────────────────────────
    content = readingTimeBadge(content) + content;

    // ── PUBLISH ──────────────────────────────────────────────────
    const result  = await publishToWordPress(content, meta, uploadedImg?.id, auth);
    const postUrl = `${WORDPRESS_URL}/${result.slug}/`;

    // ── INTERNAL LINKS (sequential Gemini call after publish) ────
    const internalLinks = await generateInternalLinks(auth, meta.title);
    if (internalLinks) {
      await updatePostContent(auth, result.id, content + internalLinks);
    }

    // ── INDEXNOW ─────────────────────────────────────────────────
    await pingIndexNow(postUrl);

    // ── QUORA ANSWERS (private WP draft) ─────────────────────────
    await generateAndSaveQuoraAnswers(auth, productContext, POST_TYPE, postUrl, meta.title);

    // ── MARK DONE ────────────────────────────────────────────────
    markPosted(postKey, POST_TYPE);

    console.log("\n==========================================");
    console.log(`✅ SUCCESS — "${postKey}" is LIVE`);
    console.log(`📋 Type : ${POST_TYPE.toUpperCase()}`);
    console.log(`🔗 URL  : ${postUrl}`);
    console.log("==========================================\n");

  } catch (err) {
    console.error("\n❌ CRITICAL ERROR:");
    console.error(`  ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
